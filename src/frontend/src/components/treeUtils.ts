import type { BomLine } from '../types/bom';

export interface TreeRow {
  line: BomLine;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * Reconstructs a hierarchical pre-order list from the flat, sort-ordered lines,
 * honouring the set of collapsed node ids. Depth is taken from each line's level.
 */
export function buildVisibleRows(lines: BomLine[], collapsed: Set<string>): TreeRow[] {
  const childrenByParent = new Map<string | null, BomLine[]>();
  for (const line of lines) {
    const key = line.parentId;
    const bucket = childrenByParent.get(key);
    if (bucket) bucket.push(line);
    else childrenByParent.set(key, [line]);
  }
  for (const bucket of childrenByParent.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const rows: TreeRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const line of children) {
      const kids = childrenByParent.get(line.id) ?? [];
      const isCollapsed = collapsed.has(line.id);
      rows.push({
        line,
        depth,
        hasChildren: kids.length > 0,
        expanded: !isCollapsed,
      });
      if (kids.length > 0 && !isCollapsed) {
        walk(line.id, depth + 1);
      }
    }
  };
  walk(null, 1);
  return rows;
}

/** Ordered siblings of a line (same parent), used for move up/down. */
export function siblingsOf(lines: BomLine[], line: BomLine): BomLine[] {
  return lines
    .filter((l) => l.parentId === line.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The line itself plus every descendant; these are invalid move targets for that line. */
export function descendantIdsOf(lines: BomLine[], lineId: string): Set<string> {
  const childrenByParent = new Map<string | null, BomLine[]>();
  for (const line of lines) {
    const bucket = childrenByParent.get(line.parentId);
    if (bucket) bucket.push(line);
    else childrenByParent.set(line.parentId, [line]);
  }

  const ids = new Set<string>();
  const stack = [lineId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (ids.has(current)) continue;
    ids.add(current);
    for (const child of childrenByParent.get(current) ?? []) stack.push(child.id);
  }
  return ids;
}
