import { apiClient } from './client';
import type {
  CreateRouteOperationRequest,
  MoveRouteOperationRequest,
  RouteOperation,
  UpdateRouteOperationRequest,
} from '../types/route';

export async function createRouteOperation(
  routeId: string,
  request: CreateRouteOperationRequest,
): Promise<RouteOperation> {
  const { data } = await apiClient.post<RouteOperation>(`/routes/${routeId}/operations`, request);
  return data;
}

export async function updateRouteOperation(
  routeId: string,
  operationId: string,
  request: UpdateRouteOperationRequest,
): Promise<RouteOperation> {
  const { data } = await apiClient.put<RouteOperation>(
    `/routes/${routeId}/operations/${operationId}`,
    request,
  );
  return data;
}

export async function deleteRouteOperation(routeId: string, operationId: string): Promise<void> {
  await apiClient.delete(`/routes/${routeId}/operations/${operationId}`);
}

export async function moveRouteOperation(
  routeId: string,
  operationId: string,
  request: MoveRouteOperationRequest,
): Promise<void> {
  await apiClient.post(`/routes/${routeId}/operations/${operationId}/move`, request);
}
