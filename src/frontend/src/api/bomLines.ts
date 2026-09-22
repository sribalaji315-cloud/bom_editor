import { apiClient } from './client';
import type {
  BomLine,
  CreateBomLineRequest,
  InsertBomRequest,
  UpdateBomLineRequest,
  MoveBomLineRequest,
} from '../types/bom';

export async function createBomLine(
  documentId: string,
  request: CreateBomLineRequest,
): Promise<BomLine> {
  const { data } = await apiClient.post<BomLine>(`/boms/${documentId}/lines`, request);
  return data;
}

export async function updateBomLine(
  documentId: string,
  lineId: string,
  request: UpdateBomLineRequest,
): Promise<BomLine> {
  const { data } = await apiClient.put<BomLine>(`/boms/${documentId}/lines/${lineId}`, request);
  return data;
}

export async function deleteBomLine(documentId: string, lineId: string): Promise<void> {
  await apiClient.delete(`/boms/${documentId}/lines/${lineId}`);
}

export async function restoreBomLine(documentId: string, lineId: string): Promise<void> {
  await apiClient.post(`/boms/${documentId}/lines/${lineId}/restore`);
}

/** Hard-deletes the line and its subtree; unlike deleteBomLine this cannot be undone. */
export async function purgeBomLine(documentId: string, lineId: string): Promise<void> {
  await apiClient.delete(`/boms/${documentId}/lines/${lineId}/permanent`);
}

export async function insertBom(
  documentId: string,
  request: InsertBomRequest,
): Promise<void> {
  await apiClient.post(`/boms/${documentId}/lines/insert-bom`, request);
}

export async function moveBomLine(
  documentId: string,
  lineId: string,
  request: MoveBomLineRequest,
): Promise<void> {
  await apiClient.post(`/boms/${documentId}/lines/${lineId}/move`, request);
}
