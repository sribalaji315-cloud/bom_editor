import type { BomDocumentStatus } from './bom';

export type ValidationSeverity = 'Error' | 'Warning';

export type ValidationRuleType =
  | 'RequiredField'
  | 'NumericField'
  | 'AllowedValues'
  | 'MaxLength'
  | 'ReleaseTemplateExists'
  | 'RouteCodeExists'
  | 'UniqueChildBsObjectId'
  | 'MaxDepth'
  | 'PlmExpressionRequired'
  | 'PhantomMustHaveChildren';

export interface ValidationIssue {
  ruleCode: string;
  ruleName: string;
  severity: ValidationSeverity;
  lineId: string | null;
  lineDescription: string | null;
  field: string | null;
  message: string;
}

export interface ValidationReport {
  documentId: string;
  validatedAt: string;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

export interface ValidationRuleFields {
  name: string;
  type: ValidationRuleType;
  severity: ValidationSeverity;
  targetField: string | null;
  parameters: string | null;
  appliesWhen: string | null;
  appliesToStatuses: BomDocumentStatus[];
  message: string | null;
}

export interface ValidationRule extends ValidationRuleFields {
  id: string;
  code: string;
  isActive: boolean;
}

export type CreateValidationRuleRequest = ValidationRuleFields & { code: string };

export type UpdateValidationRuleRequest = ValidationRuleFields & { isActive: boolean };

export interface ValidationMetadata {
  ruleTypes: ValidationRuleType[];
  fields: string[];
  severities: ValidationSeverity[];
  filterFields: string[];
  filterOperators: string[];
  documentStatuses: BomDocumentStatus[];
}
