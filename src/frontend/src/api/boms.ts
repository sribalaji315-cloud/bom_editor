import { apiClient } from './client';
import type {
  BomAuditEntry,
  BomDocumentDetail,
  BomDocumentSummary,
  BomImportMapping,
  ImportInspectResult,
} from '../types/bom';

export async function getBomDocuments(): Promise<BomDocumentSummary[]> {
  const { data } = await apiClient.get<BomDocumentSummary[]>('/boms');
  return data;
}

export async function getBomDocument(id: string): Promise<BomDocumentDetail> {
  const { data } = await apiClient.get<BomDocumentDetail>(`/boms/${id}`);
  return data;
}

export async function getBomAudit(id: string): Promise<BomAuditEntry[]> {
  const { data } = await apiClient.get<BomAuditEntry[]>(`/boms/${id}/audit`);
  return data;
}

export async function inspectBomImport(file: File): Promise<ImportInspectResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ImportInspectResult>('/boms/import/inspect', form);
  return data;
}

export async function importBomDocument(
  file: File,
  name: string,
  mapping: BomImportMapping,
): Promise<BomDocumentSummary> {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  form.append('mapping', JSON.stringify(mapping));
  const { data } = await apiClient.post<BomDocumentSummary>('/boms/import', form);
  return data;
}

export async function deleteBomDocument(id: string): Promise<void> {
  await apiClient.delete(`/boms/${id}`);
}

export async function exportBomDocument(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/boms/${id}/export`, { responseType: 'blob' });
  return data as Blob;
}
