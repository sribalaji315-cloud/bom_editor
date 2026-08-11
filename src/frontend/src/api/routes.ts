import { apiClient } from './client';
import type {
  CreateRouteRequest,
  RouteAuditEntry,
  RouteDetail,
  RouteImportResult,
  RouteSummary,
  UpdateRouteRequest,
} from '../types/route';

export async function getRoutes(): Promise<RouteSummary[]> {
  const { data } = await apiClient.get<RouteSummary[]>('/routes');
  return data;
}

export async function getRouteCodes(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/routes/codes');
  return data;
}

export async function getRoute(id: string): Promise<RouteDetail> {
  const { data } = await apiClient.get<RouteDetail>(`/routes/${id}`);
  return data;
}

export async function getRouteAudit(id: string): Promise<RouteAuditEntry[]> {
  const { data } = await apiClient.get<RouteAuditEntry[]>(`/routes/${id}/audit`);
  return data;
}

export async function createRoute(request: CreateRouteRequest): Promise<RouteDetail> {
  const { data } = await apiClient.post<RouteDetail>('/routes', request);
  return data;
}

export async function updateRoute(id: string, request: UpdateRouteRequest): Promise<RouteDetail> {
  const { data } = await apiClient.put<RouteDetail>(`/routes/${id}`, request);
  return data;
}

export async function deleteRoute(id: string): Promise<void> {
  await apiClient.delete(`/routes/${id}`);
}

export async function importRoutes(file: File): Promise<RouteImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<RouteImportResult>('/routes/import', form);
  return data;
}

export async function exportRoute(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/routes/${id}/export`, { responseType: 'blob' });
  return data as Blob;
}
