# Move to parent, Add BOM from database, Soft delete

Design record for three BOM editor features. Status: implemented (backend build, frontend build + lint,
migration applied).

## 1. Move items within hierarchy by specifying parent node
The backend `MoveLineAsync` / `POST /api/boms/{id}/lines/{lineId}/move` already re-parents a line
(validates self/descendant/cycle). Only the UI was missing.

- New `MoveLineModal` (searchable tree). The user clicks the exact target node, so a parent that appears in
  multiple places is disambiguated by selecting the specific node (its level is shown by indentation).
  A "Top level (no parent)" option re-parents to root.
- Targets exclude the moving line, its descendants (`treeUtils.descendantIdsOf`), and soft-deleted lines.
- `BomTreeGrid` gains a move-to-parent action (`IconArrowsMove`) alongside the existing up/down reorder.
- On confirm the page computes `sortOrder = max sibling sortOrder under the chosen parent + 1`.

## 2. Add BOM from database
Insert copies of **specific selected nodes** (each with its subtree) from another BOM document — not the
whole structure.

- Service `InsertBomAsync(documentId, InsertBomRequest{SourceDocumentId, ParentId, LineIds})`:
  - Blocks inserting a BOM into itself.
  - Copy set = union of the selected lines' subtrees (non-deleted, de-duplicated), new GUIDs, parent ids
    remapped. A copied line whose source parent is outside the set is a "root" and is attached under the
    chosen target parent (or top level), preserving relative order. Copied lines' `Action = Add`.
  - Validates the target parent belongs to the document and is not soft-deleted; requires at least one node.
- Endpoint `POST /api/boms/{id}/lines/insert-bom` (EditPolicy).
- Frontend `AddBomModal`: pick a source BOM (documents list minus current), pick a target parent (top level
  default or any non-deleted node), then check specific source nodes in a tree (each brings its sub-items).

## 3. Soft delete with strike-through
Deleting keeps the line in the database, shown struck through, and excluded from export.

- New `BomLine.IsDeleted` (migration `AddBomLineIsDeleted`); read-only `BomLineDto.IsDeleted`.
- `DeleteLineAsync` flags the target and its subtree instead of hard-deleting; `RestoreLineAsync` un-flags.
  Cascade to children; restorable. New `AuditChangeType.Restore`.
- `CsvExportService` filters out `IsDeleted` lines.
- Endpoint `POST /api/boms/{id}/lines/{lineId}/restore` (EditPolicy).
- Frontend: struck-through/dimmed rows (`getRowStyle`), cell editing disabled on deleted rows, and the row
  actions collapse to a single Restore button when deleted.

## Out of scope
No permanent/hard-delete UI, no parts catalog, no drag-and-drop, no import/PLM changes.
