# BOM Editor — CSV-seeded, editable tree grid

## Summary
Greenfield full-stack build per CLAUDE.md (.NET 10 minimal API + React/Mantine/AG Grid,
SQLite/EF Core). Import the mBOM CSV **once to seed a database**, edit BOM lines in a
hierarchical tree grid, stage PLM changes via the `Action` column (KEEP/ADD/DELETE) as a
change-set, audit every change, and export back to the original CSV column layout.

## Locked decisions
- Full stack scaffold now (backend + frontend + DB).
- CSV: import once to seed DB; editing/persistence DB-based; CSV export included (original layout).
- `Action` column = change-set/delta staging for PLM (enum Keep/Add/Delete, user-set).
- All 24 attribute columns editable (except reconstructed `level1–8`, derived from tree depth).
- Natural-language `Conditions`/`Formula` = plain free-text fields (no AI in v1), preserved verbatim.
- Auth + 4 roles from the start. Edit: Data Specialist + Admin. Read-only: Manufacturing + Engineering.
- Hierarchy = self-referencing tree (`ParentId` + `SortOrder`); derive `level1–8` on export.
- Multiple BOMs: `BomDocument` owns many `BomLine`; list/open multiple.
- Include audit log (who/when/what).
- AG Grid **Community** with custom tree rendering (avoids Enterprise licensing for ~500 users).

## Data model
- **BomDocument**: Id, Name, SourceFileName, CreatedAt, CreatedBy, UpdatedAt.
- **BomLine**: Id, BomDocumentId, ParentId?, SortOrder(int), Action(enum), Position(string),
  BsObjectId, LegacySwingId, DrawingNo, Description, FinalQuantity(string — may be "Formula"),
  Constant(string), Class, Uom, IsEbom(bool), Phantom(bool), ReleaseTemplate, Conditions(text),
  Formula(text), Route, BomExplosion, NoOfPiecesInPack(string), WeightKg(string), VolumeM3(string).
  - Numeric-looking fields stored as string because CSV uses the literal `"Formula"`.
  - `level1–8` not stored — depth `d` → value `d` in `levelD` on export.
- **BomAuditEntry**: Id, BomDocumentId, BomLineId?, UserId, Timestamp, ChangeType, FieldName, OldValue, NewValue.

## Phases
0. **Scaffold** — backend `.sln` + 3 projects (Api/Core/Data per CLAUDE 3-layer); Vite React TS app
   with folder structure, Mantine Nord theme, AG Grid, TanStack Query, react-i18next
   (`common`, `bom`, `errors`), `/api` proxy.
1. **Data + EF Core** — Core domain + enums; Data `AppDbContext` + `AppUser` Identity;
   restrict-delete FKs; initial migration; seed 4 roles + a dev user per role.
2. **Auth** — Identity + JWT (HS256, claims id/email/name/roles); `/api/auth/login`; `AuthContext`;
   `ProtectedRoute` with `hasRole()`; role-gated edit vs read-only.
3. **CSV import + BOM list** — `CsvImportService` (level columns → tree), `/api/boms` list/get/import,
   `BomListPage`.
4. **Editor grid (view)** — `BomTreeGrid`, all columns, Nord styling, `BomEditorPage`.
5. **Editing** — inline edit, add/delete/move (reparent + reorder), per-line Action; `BomService` owns
   validation + persistence + audit; `/api/boms/{id}/lines` CRUD + move.
6. **Export** — `CsvExportService` rebuilds original 27-column layout; `/api/boms/{id}/export` download.
7. **Validation + in-app help + polish** — boundary validation; contextual role help; i18n sweep.

## Verification
1. `dotnet build` / `dotnet test` pass; `dotnet-ef database update` seeds roles + users.
2. Import `ODIN_Tibas…csv` → line count matches non-empty rows; tree depth matches level columns.
3. Login as Data Specialist → edit works; as Manufacturing → read-only (UI + API 403).
4. Edit a field → audit entry with old/new; move a line → `ParentId`/`SortOrder` updated + audit.
5. Export round-trips original layout; re-import equals. `npm run build` + `npm run lint` clean;
   no hardcoded strings or Nord hex.
