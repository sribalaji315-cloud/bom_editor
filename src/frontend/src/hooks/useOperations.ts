import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  approveOperation,
  createOperation,
  deleteOperation,
  getOperations,
  getSelectableOperations,
  rejectOperation,
  requestOperation,
  updateOperation,
} from '../api/operations';
import type {
  CreateOperationRequest,
  RequestOperationRequest,
  ReviewOperationRequest,
  UpdateOperationRequest,
} from '../types/operation';

export function useOperations() {
  return useQuery({
    queryKey: queryKeys.operations.lists(),
    queryFn: getOperations,
  });
}

export function useSelectableOperations() {
  return useQuery({
    queryKey: queryKeys.operations.selectable(),
    queryFn: getSelectableOperations,
  });
}

function useOperationsInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.operations.all });
}

export function useCreateOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: (request: CreateOperationRequest) => createOperation(request),
    onSuccess: invalidate,
  });
}

export function useRequestOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: (request: RequestOperationRequest) => requestOperation(request),
    onSuccess: invalidate,
  });
}

export function useUpdateOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateOperationRequest }) =>
      updateOperation(id, request),
    onSuccess: invalidate,
  });
}

export function useApproveOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ReviewOperationRequest }) =>
      approveOperation(id, request),
    onSuccess: invalidate,
  });
}

export function useRejectOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: (id: string) => rejectOperation(id),
    onSuccess: invalidate,
  });
}

export function useDeleteOperation() {
  const invalidate = useOperationsInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteOperation(id),
    onSuccess: invalidate,
  });
}
