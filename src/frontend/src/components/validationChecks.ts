import type { ValidationRuleType } from '../types/validation';

export type CheckArgumentUsage = 'required' | 'optional' | 'ignored';

/** Which of the two argument fields each check actually reads. */
export const CHECK_USAGE: Record<
  ValidationRuleType,
  { field: CheckArgumentUsage; parameters: CheckArgumentUsage }
> = {
  RequiredField: { field: 'required', parameters: 'ignored' },
  NumericField: { field: 'required', parameters: 'optional' },
  AllowedValues: { field: 'required', parameters: 'required' },
  MaxLength: { field: 'required', parameters: 'required' },
  ReleaseTemplateExists: { field: 'ignored', parameters: 'ignored' },
  RouteCodeExists: { field: 'ignored', parameters: 'ignored' },
  UniqueChildBsObjectId: { field: 'ignored', parameters: 'ignored' },
  MaxDepth: { field: 'ignored', parameters: 'required' },
  PlmExpressionRequired: { field: 'required', parameters: 'ignored' },
  PhantomMustHaveChildren: { field: 'ignored', parameters: 'ignored' },
};
