import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { deleteBomDocument, importBomDocument, inspectBomImport } from '../api/boms';
import {
  createBomLine,
  deleteBomLine,
  insertBom,
  moveBomLine,
  purgeBomLine,
  restoreBomLine,
  updateBomLine,
} from '../api/bomLines';
import type {
  BomImportMapping,
  CreateBomLineRequest,
  InsertBomRequest,
  MoveBomLineRequest,
  UpdateBomLineRequest,
} from '../types/bom';

export function useInspectBomImport() {
  return useMutation({
    mutationFn: (file: File) => inspectBomImport(file),
  });
}

export function useImportBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name, mapping }: { file: File; name: string; mapping: BomImportMapping }) =>
      importBomDocument(file, name, mapping),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.boms.all }),
  });
}

export function useDeleteBomDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBomDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.boms.all }),
  });
}

function useDocumentInvalidation(documentId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.boms.detail(documentId) });
    void qc.invalidateQueries({ queryKey: queryKeys.boms.audit(documentId) });
    void qc.invalidateQueries({ queryKey: queryKeys.boms.lists() });
  };
}

export function useCreateBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (request: CreateBomLineRequest) => createBomLine(documentId, request),
    onSuccess: invalidate,
  });
}

export function useUpdateBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: ({ lineId, request }: { lineId: string; request: UpdateBomLineRequest }) =>
      updateBomLine(documentId, lineId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (lineId: string) => deleteBomLine(documentId, lineId),
    onSuccess: invalidate,
  });
}

export function useRestoreBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (lineId: string) => restoreBomLine(documentId, lineId),
    onSuccess: invalidate,
  });
}

export function usePurgeBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (lineId: string) => purgeBomLine(documentId, lineId),
    onSuccess: invalidate,
  });
}

export function useInsertBom(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: (request: InsertBomRequest) => insertBom(documentId, request),
    onSuccess: invalidate,
  });
}

export function useMoveBomLine(documentId: string) {
  const invalidate = useDocumentInvalidation(documentId);
  return useMutation({
    mutationFn: ({ lineId, request }: { lineId: string; request: MoveBomLineRequest }) =>
      moveBomLine(documentId, lineId, request),
    onSuccess: invalidate,
  });
}
