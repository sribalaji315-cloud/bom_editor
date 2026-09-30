import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  createValidationRule,
  deleteValidationRule,
  getValidationMetadata,
  getValidationRules,
  updateValidationRule,
  validateBomDocument,
} from '../api/validation';
import type {
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
} from '../types/validation';

export function useValidateBom(documentId: string) {
  return useMutation({
    mutationFn: () => validateBomDocument(documentId),
  });
}

export function useValidationRules() {
  return useQuery({
    queryKey: queryKeys.validation.rules(),
    queryFn: getValidationRules,
  });
}

export function useValidationMetadata() {
  return useQuery({
    queryKey: queryKeys.validation.metadata(),
    queryFn: getValidationMetadata,
    staleTime: Infinity,
  });
}

function useValidationInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.validation.all });
}

export function useCreateValidationRule() {
  const invalidate = useValidationInvalidation();
  return useMutation({
    mutationFn: (request: CreateValidationRuleRequest) => createValidationRule(request),
    onSuccess: invalidate,
  });
}

export function useUpdateValidationRule() {
  const invalidate = useValidationInvalidation();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateValidationRuleRequest }) =>
      updateValidationRule(id, request),
    onSuccess: invalidate,
  });
}

export function useDeleteValidationRule() {
  const invalidate = useValidationInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteValidationRule(id),
    onSuccess: invalidate,
  });
}
