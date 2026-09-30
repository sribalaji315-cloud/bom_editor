# Operations Definition Page

## Scope (agreed)
- New master-data page for **Operations** (`Code` + `Description`), managed by **Data Specialist + Admin**
  (`EditPolicy`); readable by any authenticated user.
- Route editor `Operation ID` **and** `Description` cells become **searchable dropdowns** fed by that list.
  Picking either one fills the other. `Description` is locked to the definition (no free text).
- Any authenticated user can **request** a new operation from inside the dropdown. The request is queued as
  `Requested` and is **not** selectable until a Data Specialist approves it.
- One-time **backfill** of distinct `RouteOperations.OperationId` + `Description` as `Approved`.
- `RouteOperation.OperationId` stays a plain **string** (join by code) — Route CSV import/export unchanged.

## Excluded
- No FK from `RouteOperation` to `Operation`.
- No change to the Route CSV layout or parsing.
- No `OperationExists` validation rule (possible follow-up, mirroring `RouteCodeExists`).
- No email/notification on request; a pending count badge on the page only.

## Backend
1. `Core/Enums/OperationStatus.cs` — `Requested`, `Approved`, `Rejected`.
2. `Core/Domain/Operation.cs` — `Id`, `Code`, `Description`, `Status`, `IsActive`, `RequestReason?`,
   `RequestedBy?`, `RequestedAt?`, `ReviewedBy?`, `ReviewedAt?`, `CreatedAt`, `UpdatedAt`.
3. `Core/Dtos/OperationDtos.cs` — `OperationDto`, `OperationOptionDto(Code, Description)`,
   `CreateOperationRequest`, `UpdateOperationRequest`, `RequestOperationRequest`, `ReviewOperationRequest`.
4. `Core/Interfaces/IOperationService.cs` — GetAll / GetSelectable / Create / Request / Update / Approve /
   Reject / Delete.
5. `Api/Services/OperationService.cs` — mirrors `ReleaseTemplateService`; case-insensitive unique code;
   `GetSelectableAsync` = `Approved && IsActive`.
6. `Api/Endpoints/OperationEndpoints.cs` — `/api/operations`. `GET /`, `GET /selectable`,
   `POST /requests` for any authenticated user; `POST /`, `PUT /{id}`, `POST /{id}/approve`,
   `POST /{id}/reject`, `DELETE /{id}` behind `BomEndpoints.EditPolicy`.
7. `Data/AppDbContext.cs` — `DbSet<Operation>`; Code required max 64 + unique index, Description required
   max 256, `Status` stored as string.
8. Migration `AddOperations`.
9. `Program.cs` — register `IOperationService` + `MapOperationEndpoints()`.
10. `Api/Data/DbSeeder.cs` — `SeedOperationsAsync` backfill, only when the table is empty.

## Frontend
11. `types/operation.ts`, `api/operations.ts`, `queryKeys.operations`, `hooks/useOperations.ts`.
12. `components/domain/OperationTable.tsx`, `OperationFormModal.tsx`, `OperationRequestModal.tsx`.
13. `pages/OperationsPage.tsx` — Pending (count badge) / All tabs; `canEdit` gates every action.
14. `i18n` — `operations` namespace + `common.json` `nav.operations`.
15. `App.tsx` route `/operations` (any role); `AppLayout` top-level **Operations** NavLink next to Routes.
16. `components/ui/OperationCellEditor.tsx` — AG Grid popup editor with a searchable Mantine `Select`;
    options from `params.context.operations`; appends the row's current value when it is not in the list
    so legacy imported codes stay visible; footer button raises `context.requestOperation()`.
17. `RouteOperationsGrid` — new `operations` / `onRequestOperation` props; `operationId` and `description`
    both use the new editor; `onCellValueChanged` resolves the paired field and sends one update.
18. `RouteEditorPage` — `useSelectableOperations()`, hosts `OperationRequestModal`.

## Verification
- `dotnet build`; `dotnet-ef migrations has-pending-model-changes` → "No changes".
- Backfill: `GET /api/operations` lists the codes already present in existing routes as `Approved`.
- manufacturing: `GET` 200, `POST /` 403, `POST /requests` 201; requested code absent from `/selectable`;
  dataspecialist approve → present. Duplicate code 400, blank description 400.
- `npm run build` + `npm run lint`.
- Browser: both cells open a searchable dropdown, picking one fills the other and survives a reload;
  unknown imported code still displays; request creates a pending row; manufacturing sees read-only.
