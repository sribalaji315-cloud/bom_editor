# Routes page + BOM line route lookup

## Summary
Add a top-level **Routes** area that mirrors the BOM feature, and wire the existing
`BomLine.Route` string to a validated dropdown of defined route codes.

A Route is a **flat aggregate**: a header plus an ordered list of operations (not a tree).
Mapping: `Route` ≈ `BomDocument`, `RouteOperation` ≈ `BomLine` (flat, ordered by `SortOrder`).

## Settled decisions
- **Route shape**: flat header + ordered operations list.
- **BOM link**: `BomLine.Route` stays a string (CSV unchanged); edited via a validated `Select`
  dropdown of active route **codes** (mirror the Release Template lookup). Imported values that
  are not in the catalog are preserved.
- **Join key**: the ROUTE **code** (`ROUTE1`, `ROUTE2`, …). Verified: BOM `Route` column holds
  `ROUTE1..ROUTE21`; `ROUTE TEMPLATE.csv` first column holds the matching codes.
- **Editing**: full CRUD of routes + operations, plus CSV import in the ROUTE TEMPLATE format.
- **Placement / permissions**: top-level nav "Routes"; editable by Editors (DataSpecialist + Admin)
  via the existing `EditPolicy`; read for all authenticated users.
- **Fields**: include `ROUTE CONDITION` + `ROUTE FORMULA` text fields, plus `ROUTE GROUP ID` and
  `PRIORITY`. These are route-scoped (they repeat per route in the CSV, on the first operation row).

## Data model
**Route** (header aggregate root)
- `Id` Guid, `Code` string (unique — the join key, e.g. `ROUTE2`), `RouteNumber` string?
  (`RT000000642`), `Name` string? (Route name), `RouteGroupId` string? (`P-ZPPL`),
  `Priority` string? (`Primary`), `Condition` string? (ROUTE CONDITION),
  `Formula` string? (ROUTE FORMULA), `IsActive` bool (dropdown filter),
  `CreatedAt`/`UpdatedAt` DateTimeOffset, `CreatedBy` string?, `Operations` collection.

**RouteOperation** (flat child, ordered by `SortOrder`)
- `Id` Guid, `RouteId` FK, `SortOrder` int, `OperationNo` string? (`10`),
  `OperationId` string? (`pack001`), `Description` string? (`Packing`),
  `DescriptionLen` string? (`7`), `NextOperation` string? (`0`/`20`), `SwingWc` string? (`AC820`),
  `RuntimeType` string? (`STATIC`), `SetUpTime` string?, `Time` string? (`2.1`),
  `ResourceId` string? (`IN1_010`), `ResourceGroup` string? (`RG_IN1_010`).
- Numeric fields stored as **string** for round-trip (repo convention).

**RouteAuditEntry** — mirror `BomAuditEntry`: `Id`, `RouteId`, `RouteOperationId?`, `Timestamp`,
`UserId`, `UserName`, `ChangeType` (reuse `AuditChangeType`), `FieldName`, `OldValue`, `NewValue`.
Immutable; one entry per changed field.

## Backend (src/backend)
**Core**
- `Domain/Route.cs`, `Domain/RouteOperation.cs`, `Domain/RouteAuditEntry.cs`
- `Dtos/RouteDtos.cs` — `RouteOperationFields`, `RouteOperationDto`, `RouteHeaderFields`,
  `RouteSummaryDto`, `RouteDetailDto` (+Operations), `CreateRouteRequest`, `UpdateRouteRequest`,
  `CreateRouteOperationRequest`, `UpdateRouteOperationRequest`, `MoveRouteOperationRequest`,
  `RouteAuditEntryDto`
- `Interfaces/IRouteService.cs`, `Interfaces/IRouteImportService.cs`

**Api**
- `Services/RouteService.cs` — copy `BomService` orchestration (ApplyFields/DiffFields/AddAudit/Touch,
  next-sort-order, case-insensitive unique Code).
- `Services/RouteImportService.cs` — parse ROUTE TEMPLATE (a non-empty ROUTE/ROUTE NUMBER starts a new
  route; blank rows skipped; empty-route rows = extra operations of the current route). **Upsert by Code.**
- `Csv/RouteCsvColumns.cs` — ordered header for round-trip.
- `Endpoints/RouteEndpoints.cs` — group `/api/routes`:
  - `GET /` (auth), `GET /codes` (auth, active codes for dropdown), `GET /{id:guid}` (auth),
    `GET /{id:guid}/audit` (auth), `POST /` (Edit), `PUT /{id:guid}` (Edit), `DELETE /{id:guid}` (Edit),
    `POST /{id:guid}/operations` (Edit), `PUT /{id:guid}/operations/{opId}` (Edit),
    `DELETE /{id:guid}/operations/{opId}` (Edit), `POST /{id:guid}/operations/{opId}/move` (Edit),
    `POST /import` (Edit + DisableAntiforgery), `GET /{id:guid}/export` (auth).

**Data**
- `AppDbContext` — DbSets for Route/RouteOperation/RouteAuditEntry; unique index on `Route.Code`;
  composite index `(RouteId, SortOrder)`; enum-as-string; DateTimeOffset binary converter;
  cascade Route→Operations.
- Migration `AddRoutes` (DbSeeder auto-applies on startup).

**Program.cs** — register `IRouteService`/`RouteService` + `IRouteImportService`/`RouteImportService`;
`app.MapRouteEndpoints()`.

## Frontend (src/frontend/src)
- `types/route.ts`
- `api/routes.ts` (getRoutes, getRouteCodes, getRoute, getRouteAudit, createRoute, updateRoute,
  deleteRoute, importRoutes, exportRoute) + `api/routeOperations.ts` (create/update/delete/move)
- `api/queryKeys.ts` — add `routes { all, lists(), detail(id), audit(id), codes() }`
- `hooks/useRoutes.ts` + `hooks/useRouteOperations.ts`
- `pages/RouteListPage.tsx` (mirror `BomListPage`)
- `pages/RouteEditorPage.tsx` (mirror `BomEditorPage`)
- `components/domain/RouteOperationsGrid.tsx` — **flat** AG Grid (no tree)
- `components/domain/RouteHelpPanel.tsx`
- `i18n/locales/en/route.json` (namespace: list, header, columns, editor, import, audit, help)
- `App.tsx` — routes `/routes` and `/routes/:id` under `ProtectedRoute` + `AppLayout`
- `components/layout` `AppLayout` — top-level "Routes" NavLink (parallel to BOM Documents)

## BOM integration (dropdown)
- `BomTreeGrid.tsx` route column → `agSelectCellEditor`, new `routeOptions: string[]` prop,
  per-row `cellEditorParams` function `['', ...activeCodes, currentValueIfMissing]` (Release Template pattern).
- `BomEditorPage.tsx` — `useRouteCodes()` supplies `routeOptions`.

## Verification
1. `cd src/backend; dotnet build`; add migration `AddRoutes`; `database update`.
2. Import `ROUTE TEMPLATE.csv` → 4 routes (ROUTE1..4); ROUTE3 has 2 operations.
3. `GET /api/routes/codes` populates BOM Route dropdown; `ROUTE21` (not in template) preserved on its line.
4. `npm run build` + `npm run lint` pass.
5. Browser: create route, add/edit/reorder/delete operation, audit entries appear, export round-trips.
6. Manufacturing/Engineering read-only (UI + API 403 on edit).

## Further considerations
1. Re-import: **upsert by Code** (replace that route's operations).
2. Route export: full ROUTE TEMPLATE column layout for round-trip.
3. Route-scoped header fields (GROUP ID / PRIORITY / CONDITION / FORMULA) live on the Route header.
