# Validation rules + workflow, concurrency & versions

Two phases. **Phase 1** adds an on-demand validation engine driven by an admin-editable rule
table and blocks CSV export while errors exist — closing the "prepares *validated* definitions"
gap in the requirements. **Phase 2** adds a Draft → In Review → Approved → Released status
workflow, optimistic concurrency, and version snapshots with restore. Phase 2 depends on
Phase 1 (a BOM cannot be submitted for review with validation errors).

## Agreed decisions
- Validation runs **on demand only** (button + report drawer). Not live while typing, not on import.
- Rule **types** are C# code; rule **instances** (severity, target field, parameters, on/off) are
  admin-editable data — tuning needs no deploy.
- The rule engine lives in `Core/` with zero framework dependencies.
- Snapshots are stored as JSON on a single version row (no duplicate `BomLine` table).
- Export is hard-blocked while errors exist; no bypass in v1.
- Out of scope: Route validation, Excel export, SQL Server move, test project.

---

## Phase 1 — Validation & PLM readiness

### Backend
1. `Core/Enums/ValidationRuleType.cs` — `RequiredField`, `NumericField`, `AllowedValues`,
   `MaxLength`, `ReleaseTemplateExists`, `RouteCodeExists`, `UniqueChildBsObjectId`, `MaxDepth`,
   `PlmExpressionRequired`, `PhantomMustHaveChildren`.
   `Core/Enums/ValidationSeverity.cs` — `Error`, `Warning`.
2. `Core/Domain/ValidationRule.cs` — `Id`, `Code` (unique), `Name`, `Description?`, `Type`,
   `Severity`, `TargetField?`, `ParametersJson?`, `IsActive`, `CreatedAt`, `UpdatedAt`.
3. `Core/Validation/` — `ValidationContext` (non-deleted lines, depth map, active release template
   names, active route codes), `ValidationIssue`, `IBomRuleCheck { Type; Check(ctx, rule) }` and one
   pure check class per rule type. Mirrors the `ILlmClient` / `LlmClientFactory` multi-implementation
   DI pattern.
4. `Core/Dtos/ValidationDtos.cs` — `ValidationIssueDto`, `ValidationReportDto(DocumentId,
   ValidatedAt, ErrorCount, WarningCount, Issues)`, `ValidationRuleDto`, create/update requests.
5. `Core/Interfaces/IBomValidationService.cs`, `Core/Interfaces/IValidationRuleService.cs`.
6. `Api/Services/ValidationRuleService.cs` — CRUD, case-insensitive unique `Code`
   (copy `ReleaseTemplateService`).
7. `Api/Services/BomValidationService.cs` — loads document + non-deleted lines + active rules +
   active template names + active route codes, builds the context once, dispatches per rule.
8. `Api/Endpoints/ValidationEndpoints.cs` — `POST /api/boms/{id}/validate` (any authenticated);
   `/api/validation-rules` `GET` (auth) + `POST`/`PUT`/`DELETE` (`UserEndpoints.AdminPolicy`).
9. `Api/Endpoints/ExportEndpoints.cs` — inject `IBomValidationService`; `409 Conflict` + report body
   when `ErrorCount > 0`. `CsvExportService` untouched.
10. `Data/AppDbContext.cs` — `DbSet<ValidationRule>`, unique index on `Code`,
    `HasConversion<string>()` on both enums. Migration `AddValidationRules`.
11. `Api/Data/DbSeeder.cs` — `SeedValidationRulesAsync`, idempotent by `Code`, ~8 defaults.
12. `Program.cs` — register both services + every `IBomRuleCheck`, map the endpoints.

### Frontend
13. `types/validation.ts`, `api/validation.ts`, `queryKeys.validation { all, rules() }`,
    `hooks/useValidation.ts`.
14. `components/domain/ValidationPanel.tsx` — Drawer, issues grouped Errors then Warnings,
    click to focus the row.
15. `pages/BomEditorPage.tsx` — Validate button + error-count Badge, panel, export `409` handling.
    `components/domain/BomTreeGrid.tsx` — optional `invalidLineIds` prop feeding row highlight.
16. `pages/ValidationRulesPage.tsx` + `components/domain/{ValidationRuleTable,
    ValidationRuleFormModal}.tsx` (clone the ReleaseTemplates trio); `/admin/validation-rules`
    route (Admin), Admin NavLink, `validation` i18n namespace.

---

## Phase 2 — Workflow, concurrency & versions

17. `Core/Enums/BomDocumentStatus.cs` — `Draft`, `InReview`, `Approved`, `Released`;
    `AuditChangeType` += `Status`; `BomDocument` += `Status`, `StatusChangedAt`, `StatusChangedBy`;
    status surfaced on both document DTOs.
18. `BomService.ChangeStatusAsync` — legal-transition + role check; `Draft → InReview` requires zero
    validation errors; one audit entry. All mutating methods reject edits unless status is `Draft`.
19. `Program.cs` — `ApprovePolicy` (DataSpecialist + Admin), `ReleasePolicy` (Admin);
    `POST /api/boms/{id}/status`, `409` on illegal transition or outstanding errors.
20. Optimistic concurrency — `ConcurrencyStamp` `Guid` on `BomLine` and `BomDocument`,
    `.IsConcurrencyToken()`, reassigned on every write (SQLite has no rowversion). Requests carry the
    stamp; mismatch → `409` + current row. Frontend mutations notify and refetch on `409`.
21. `BomDocumentVersion` (`Id`, `BomDocumentId`, `VersionNumber`, `Label?`, `Status`, `CreatedAt`,
    `CreatedBy`, `SnapshotJson`). Auto-snapshot on `Approved` and `Released`; manual snapshot for
    editors; `GET`/`POST` versions and Admin-only restore.
22. Migration `AddBomWorkflowAndVersions`; existing documents default to `Draft`.
23. Frontend — status Badge on list cards and editor header, role-gated Submit/Approve/Reject/Release,
    grid read-only unless `Draft`, `VersionsDrawer` with restore, `status.*` + `versions.*` i18n keys.

---

## Verification
1. `dotnet build`, then `dotnet tool run dotnet-ef migrations has-pending-model-changes
   --project Haworth.BOMeditor.Data --startup-project Haworth.BOMeditor.Api` → **no changes**.
2. Seeded rules: admin `GET /api/validation-rules` returns them; manufacturing `GET` 200 / `POST` 403.
3. Import the ODIN mBOM, blank a Description → `POST /api/boms/{id}/validate` reports that line;
   export → `409` with report; fix → zero errors, export → 200 CSV.
4. Deactivate that rule in the admin page → validation clean, export succeeds (rules are data-driven).
5. Two tabs editing the same cell → second save shows the conflict notice and refreshes.
6. Submit with errors → rejected; fix + submit → `InReview`, grid read-only; approve → `Approved`
   + automatic version; restore → lines revert with an audit entry.
7. `npm run build` + `npm run lint` clean (`npm run build` is the only check that catches type drift).

## Open items
1. Admin-only `?force=true` export override (audited) instead of a hard block.
2. Should the submitter be barred from approving their own BOM.
3. Version diff/compare endpoint — Phase 2 or later.
