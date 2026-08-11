# Import Column Mapping

## Summary
The current importer reads CSV columns by **fixed position** assuming the 28-column mBOM
template (levels at indices 1–8, `BS Object ID` at 10, …). Real files vary (e.g. the EBOM
export uses `level1–5`, `BS Object ID` at index 6, extra `Comfiguration` / `NOTES INDIA`
columns). This feature adds a **column-mapping step** so a Data Specialist / Admin can map
each source column to a target BOM field before the rows are imported.

## Locked decisions (from design discussion)
- **Two-step flow**: upload → backend auto-detects headers → mapping screen (best-guess
  pre-fill, user adjusts) → confirm → import. The file is re-sent on confirm (stateless; small
  files, ~500 internal users) — no server-side temp storage.
- **Hierarchy = single numeric depth column.** Going forward files carry one column holding the
  depth number (1, 2, 3, …); the legacy multi-`level` samples are no longer the target format.
  Depth `d` rebuilds the tree via the existing `lastAtDepth` parent-stack logic.
- **No saved presets.** Mapping is done per import; only auto-detected defaults are offered.
- **Required mapped fields**: `description`, `depth`, `bsObjectId`, `finalQuantity`, `class`.
  All other fields optional (unmapped → null / default).
- Export is unaffected — data is normalised into `BomLine` fields, and export keeps re-emitting
  the fixed mBOM layout (level columns derived from tree depth).

## Target fields (mapping keys)
`action, depth, position, bsObjectId, legacySwingId, drawingNo, description, finalQuantity,
constant, class, uom, isEbom, phantom, releaseTemplate, conditions, formula, route,
bomExplosion, noOfPiecesInPack, weightKg, volumeM3`

Each maps to exactly one source column index. `depth` is parsed as an integer (rows whose depth
column is empty/non-numeric are skipped as non-structural).

## Backend
- **Core/Dtos/BomImportDtos.cs** (new):
  - `ImportColumnDto(int Index, string Header)`
  - `ImportFieldDto(string Key, bool Required)`
  - `ImportInspectResult(Columns, Fields, SuggestedMapping: dict key→index, SampleRows: string[][])`
  - `BomImportMapping(IReadOnlyDictionary<string,int> Fields)`
- **Api/Csv/BomImportFields.cs** (new): canonical ordered field catalog (key, required, header
  aliases) + `Normalize` helper (strip non-alphanumerics, lowercase) for name-based auto-detect.
- **Core/Interfaces/ICsvImportService.cs**: add `InspectAsync(stream, ct)`; change `ImportAsync`
  to take a `BomImportMapping` instead of reading fixed indices.
- **Api/Services/CsvImportService.cs**:
  - `InspectAsync` — parse header row → columns; read ≤5 sample rows; greedy alias-match →
    suggested mapping (a source column is used at most once).
  - `ImportAsync` — read every field via the mapping; depth from the numeric depth column;
    validate required fields are mapped (throw `InvalidOperationException` → 400).
  - `BomCsvColumns` fixed indices no longer used by import (export still uses them).
- **Api/Endpoints/BomEndpoints.cs**:
  - `POST /api/boms/import/inspect` (EditPolicy) → `ImportInspectResult`.
  - `POST /api/boms/import` (EditPolicy) → now expects `file`, `name`, and `mapping` (JSON) form
    fields; deserialises mapping and calls the service.

## Frontend
- **types/bom.ts**: `ImportColumn`, `ImportField`, `ImportInspectResult`, `BomImportMapping`.
- **api/boms.ts**: `inspectBomImport(file)`; `importBomDocument(file, name, mapping)` (adds mapping).
- **hooks/useBomLines.ts**: `useInspectBomImport()`; `useImportBom()` mutation input becomes
  `{ file, name, mapping }`.
- **components/domain/ImportMappingModal.tsx** (new): presentational modal — a `Select` per field
  (options = source columns, pre-filled from suggested mapping, required ones marked), a small
  sample-row preview, Cancel / Import actions. No data fetching; receives inspect result +
  callbacks. Labels localised by field key.
- **pages/BomListPage.tsx**: on drop → `inspect` → open `ImportMappingModal`; on confirm →
  `import` with the assembled mapping.
- **i18n/locales/en/bom.json**: `import.mapping.*` (title/intro/column/field/preview/confirm/
  unmapped/missingRequired) and `import.fields.*` labels for every field key; inspect/import errors.

## Verification
1. Backend builds; `POST /import/inspect` on the EBOM CSV returns its columns with a sensible
   auto-mapping (description, bsObjectId, etc. pre-filled; a `level`/`depth` column → `depth`).
2. Import with a valid mapping creates a document whose tree depth matches the numeric depth
   column; missing a required field → 400.
3. Frontend: drop a CSV → mapping modal appears pre-filled → adjust → Import → navigates to editor.
4. Read-only roles cannot import (UI hidden + API 403). `npm run build` + `npm run lint` clean;
   no hardcoded strings, no inline query keys.
