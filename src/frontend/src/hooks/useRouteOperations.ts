import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { createRoute, deleteRoute, importRoutes, updateRoute } from '../api/routes';
import {
  createRouteOperation,
  deleteRouteOperation,
  moveRouteOperation,
  updateRouteOperation,
} from '../api/routeOperations';
import type {
  CreateRouteOperationRequest,
  CreateRouteRequest,
  MoveRouteOperationRequest,
  UpdateRouteOperationRequest,
  UpdateRouteRequest,
} from '../types/route';

export function useImportRoutes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importRoutes(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routes.all }),
  });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRouteRequest) => createRoute(request),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routes.all }),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routes.all }),
  });
}

function useRouteInvalidation(routeId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.routes.detail(routeId) });
    void qc.invalidateQueries({ queryKey: queryKeys.routes.audit(routeId) });
    void qc.invalidateQueries({ queryKey: queryKeys.routes.lists() });
    void qc.invalidateQueries({ queryKey: queryKeys.routes.codes() });
  };
}

export function useUpdateRoute(routeId: string) {
  const invalidate = useRouteInvalidation(routeId);
  return useMutation({
    mutationFn: (request: UpdateRouteRequest) => updateRoute(routeId, request),
    onSuccess: invalidate,
  });
}

export function useCreateRouteOperation(routeId: string) {
  const invalidate = useRouteInvalidation(routeId);
  return useMutation({
    mutationFn: (request: CreateRouteOperationRequest) => createRouteOperation(routeId, request),
    onSuccess: invalidate,
  });
}

export function useUpdateRouteOperation(routeId: string) {
  const invalidate = useRouteInvalidation(routeId);
  return useMutation({
    mutationFn: ({
      operationId,
      request,
    }: {
      operationId: string;
      request: UpdateRouteOperationRequest;
    }) => updateRouteOperation(routeId, operationId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteRouteOperation(routeId: string) {
  const invalidate = useRouteInvalidation(routeId);
  return useMutation({
    mutationFn: (operationId: string) => deleteRouteOperation(routeId, operationId),
    onSuccess: invalidate,
  });
}

export function useMoveRouteOperation(routeId: string) {
  const invalidate = useRouteInvalidation(routeId);
  return useMutation({
    mutationFn: ({
      operationId,
      request,
    }: {
      operationId: string;
      request: MoveRouteOperationRequest;
    }) => moveRouteOperation(routeId, operationId, request),
    onSuccess: invalidate,
  });
}
