import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { getRoute, getRouteAudit, getRouteCodes, getRoutes } from '../api/routes';

export function useRoutes() {
  return useQuery({
    queryKey: queryKeys.routes.lists(),
    queryFn: getRoutes,
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: queryKeys.routes.detail(id),
    queryFn: () => getRoute(id),
    enabled: !!id,
  });
}

export function useRouteAudit(id: string) {
  return useQuery({
    queryKey: queryKeys.routes.audit(id),
    queryFn: () => getRouteAudit(id),
    enabled: !!id,
  });
}

export function useRouteCodes() {
  return useQuery({
    queryKey: queryKeys.routes.codes(),
    queryFn: getRouteCodes,
  });
}
