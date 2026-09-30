import { apiClient } from './client';
import type {
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  ValidationMetadata,
  ValidationReport,
  ValidationRule,
} from '../types/validation';

export async function validateBomDocument(documentId: string): Promise<ValidationReport> {
  const { data } = await apiClient.post<ValidationReport>(`/boms/${documentId}/validate`);
  return data;
}

export async function getValidationRules(): Promise<ValidationRule[]> {
  const { data } = await apiClient.get<ValidationRule[]>('/validation-rules');
  return data;
}

export async function getValidationMetadata(): Promise<ValidationMetadata> {
  const { data } = await apiClient.get<ValidationMetadata>('/validation-rules/metadata');
  return data;
}

export async function createValidationRule(
  request: CreateValidationRuleRequest,
): Promise<ValidationRule> {
  const { data } = await apiClient.post<ValidationRule>('/validation-rules', request);
  return data;
}

export async function updateValidationRule(
  id: string,
  request: UpdateValidationRuleRequest,
): Promise<ValidationRule> {
  const { data } = await apiClient.put<ValidationRule>(`/validation-rules/${id}`, request);
  return data;
}

export async function deleteValidationRule(id: string): Promise<void> {
  await apiClient.delete(`/validation-rules/${id}`);
}
