import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  createReleaseTemplate,
  deleteReleaseTemplate,
  getReleaseTemplates,
  updateReleaseTemplate,
} from '../api/releaseTemplates';
import type {
  CreateReleaseTemplateRequest,
  UpdateReleaseTemplateRequest,
} from '../types/releaseTemplate';

export function useReleaseTemplates() {
  return useQuery({
    queryKey: queryKeys.releaseTemplates.lists(),
    queryFn: getReleaseTemplates,
  });
}

function useReleaseTemplatesInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.releaseTemplates.all });
}

export function useCreateReleaseTemplate() {
  const invalidate = useReleaseTemplatesInvalidation();
  return useMutation({
    mutationFn: (request: CreateReleaseTemplateRequest) => createReleaseTemplate(request),
    onSuccess: invalidate,
  });
}

export function useUpdateReleaseTemplate() {
  const invalidate = useReleaseTemplatesInvalidation();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateReleaseTemplateRequest }) =>
      updateReleaseTemplate(id, request),
    onSuccess: invalidate,
  });
}

export function useDeleteReleaseTemplate() {
  const invalidate = useReleaseTemplatesInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteReleaseTemplate(id),
    onSuccess: invalidate,
  });
}
