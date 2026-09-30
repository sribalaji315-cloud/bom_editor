import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  changeBomStatus,
  createBomVersion,
  getBomVersions,
  restoreBomVersion,
} from '../api/boms';
import type { ChangeBomStatusRequest, CreateBomVersionRequest } from '../types/bom';

function useDocumentInvalidation(documentId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.boms.detail(documentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.boms.audit(documentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.boms.versions(documentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.boms.lists() });
  };
}

export function useBomVersions(documentId: string) {
  return useQuery({
    queryKey: queryKeys.boms.versions(documentId),
    queryFn: () => getBomVersions(documentId),
    enabled: !!documentId,
  });
}

export function useChangeBomStatus(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (request: ChangeBomStatusRequest) => changeBomStatus(documentId, request),
    onSuccess: invalidate,
  });
}

export function useCreateBomVersion(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (request: CreateBomVersionRequest) => createBomVersion(documentId, request),
    onSuccess: invalidate,
  });
}

export function useRestoreBomVersion(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (versionId: string) => restoreBomVersion(documentId, versionId),
    onSuccess: invalidate,
  });
}
