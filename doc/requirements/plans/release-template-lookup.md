# Release Template Lookup Table

## Scope (agreed)
- New Admin-managed lookup table for **Release Template** values.
- Template record: **name only** (+ `IsActive`, timestamps, `Id`).
- BOM line keeps storing the chosen template as a **string** (the template name) — CSV import/export unchanged.
- BOM editor `Release Template` cell becomes a **dropdown** of active template names (strict: only admin-defined values selectable; an existing/legacy value on a row is still displayed and re-selectable via a per-row editor option so no data is lost).
- Remove = **active/inactive toggle + hard delete**.
- Managed by **Admin only**; the dropdown list (GET) is readable by any authenticated user.

## Backend
1. `Core/Domain/ReleaseTemplate.cs` — `Id`, `Name`, `IsActive`, `CreatedAt`, `UpdatedAt`.
2. `Core/Dtos/ReleaseTemplateDtos.cs` — `ReleaseTemplateDto(Id, Name, IsActive)`, `CreateReleaseTemplateRequest(Name)`, `UpdateReleaseTemplateRequest(Name, IsActive)`.
3. `Core/Interfaces/IReleaseTemplateService.cs` — GetAll / Create / Update / Delete.
4. `Data/AppDbContext.cs` — `DbSet<ReleaseTemplate>` + config (Name required, max length, unique index).
5. `Api/Services/ReleaseTemplateService.cs` — injects `AppDbContext`; validates non-empty + case-insensitive unique name.
6. `Api/Endpoints/ReleaseTemplateEndpoints.cs` — `/api/release-templates`; `GET` any authenticated; `POST/PUT/DELETE` require `UserEndpoints.AdminPolicy`.
7. `Program.cs` — register service + map endpoints.
8. EF migration `AddReleaseTemplates` (auto-applied by `DbSeeder.MigrateAsync` on startup).

## Frontend
9. `types/releaseTemplate.ts`, `api/releaseTemplates.ts`, `queryKeys.releaseTemplates`, `hooks/useReleaseTemplates.ts`.
10. `components/domain/ReleaseTemplateTable.tsx` + `ReleaseTemplateFormModal.tsx`.
11. `pages/ReleaseTemplatesPage.tsx` (Admin) — table + create/edit/toggle-active/delete.
12. `AppLayout` — add **Release Templates** under the Admin nav group; `App.tsx` route `/admin/release-templates` (Admin only).
13. i18n — `releaseTemplates` namespace + nav label.
14. `BomTreeGrid` — `releaseTemplate` column → `agSelectCellEditor`; values = active template names (per-row editor also includes the row's current value + a blank clear option). Names passed as a prop from `BomEditorPage` via `useReleaseTemplates`.

## Verification
- `dotnet build`; start API (migration applies); admin `POST /api/release-templates`, `GET` returns it; non-admin `POST` → 403, `GET` → 200.
- `npm run build` + `npm run lint`.
- Browser: Admin defines templates; BOM editor Release Template cell shows dropdown of active names; inactive names hidden; existing legacy value still displays.
