/** Parsing and formatting for the rule "applies when" expression, mirroring the backend grammar. */

export type ConditionJoiner = 'and' | 'or';

export interface ConditionRow {
  /** Ignored on the first row. */
  joiner: ConditionJoiner;
  field: string;
  operator: string;
  value: string;
}

export const CONDITION_OPERATORS = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'contains',
  'startswith',
  'in',
  'not in',
  'is empty',
  'is not empty',
] as const;

/** Operators that stand alone, with nothing on the right-hand side. */
export const VALUELESS_OPERATORS: string[] = ['is empty', 'is not empty'];

/** Operators whose value is a comma-separated list. */
export const LIST_OPERATORS: string[] = ['in', 'not in'];

/** Fields that only ever hold true or false. */
export const BOOLEAN_FIELDS: string[] = ['phantom', 'isEbom', 'hasChildren'];

const COMPARISON = new RegExp(
  '^\\s*([A-Za-z0-9_]+)\\s*(is\\s+not\\s+empty|is\\s+empty|not\\s+in\\b|in\\b|startswith\\b|contains\\b|>=|<=|<>|!=|=|>|<)\\s*(.*?)\\s*$',
  'i',
);

export function defaultRow(field: string): ConditionRow {
  return { joiner: 'and', field, operator: '=', value: '' };
}

/**
 * Returns null when the expression cannot be represented as builder rows, including when it uses a
 * field the server does not know about. Pass an empty list to skip the field check.
 */
export function parseConditions(
  expression: string | null | undefined,
  fields: string[] = [],
): ConditionRow[] | null {
  if (!expression || !expression.trim()) return [];

  const known = new Set(fields.map((f) => f.toLowerCase()));
  const parts = expression.trim().split(/\s+(and|or)\s+/i);
  const rows: ConditionRow[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const match = COMPARISON.exec(parts[i]);
    if (!match) return null;
    if (known.size > 0 && !known.has(match[1].toLowerCase())) return null;

    const joiner = i === 0 ? 'and' : (parts[i - 1].toLowerCase() as ConditionJoiner);
    const operator = match[2].replace(/\s+/g, ' ').toLowerCase();
    rows.push({
      joiner,
      field: match[1],
      operator: operator === '<>' ? '!=' : operator,
      value: stripListParens(match[3] ?? ''),
    });
  }

  return rows;
}

export function formatConditions(rows: ConditionRow[]): string {
  return rows
    .filter((row) => row.field && row.operator)
    .map((row, index) => `${index === 0 ? '' : `${row.joiner} `}${formatRow(row)}`)
    .join(' ')
    .trim();
}

function formatRow(row: ConditionRow): string {
  if (VALUELESS_OPERATORS.includes(row.operator)) return `${row.field} ${row.operator}`;
  const value = LIST_OPERATORS.includes(row.operator) ? `(${row.value})` : row.value;
  return `${row.field} ${row.operator} ${value}`.trim();
}

function stripListParens(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1).trim() : trimmed;
}
