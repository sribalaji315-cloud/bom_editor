import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { getBomAudit, getBomDocument, getBomDocuments } from '../api/boms';

export function useBomDocuments() {
  return useQuery({
    queryKey: queryKeys.boms.lists(),
    queryFn: getBomDocuments,
  });
}

export function useBomDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.boms.detail(id),
    queryFn: () => getBomDocument(id),
    enabled: !!id,
  });
}

export function useBomAudit(id: string) {
  return useQuery({
    queryKey: queryKeys.boms.audit(id),
    queryFn: () => getBomAudit(id),
    enabled: !!id,
  });
}
