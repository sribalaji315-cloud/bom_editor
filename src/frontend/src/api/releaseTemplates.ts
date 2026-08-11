import { apiClient } from './client';
import type {
  CreateReleaseTemplateRequest,
  ReleaseTemplate,
  UpdateReleaseTemplateRequest,
} from '../types/releaseTemplate';

export async function getReleaseTemplates(): Promise<ReleaseTemplate[]> {
  const { data } = await apiClient.get<ReleaseTemplate[]>('/release-templates');
  return data;
}

export async function createReleaseTemplate(
  request: CreateReleaseTemplateRequest,
): Promise<ReleaseTemplate> {
  const { data } = await apiClient.post<ReleaseTemplate>('/release-templates', request);
  return data;
}

export async function updateReleaseTemplate(
  id: string,
  request: UpdateReleaseTemplateRequest,
): Promise<ReleaseTemplate> {
  const { data } = await apiClient.put<ReleaseTemplate>(`/release-templates/${id}`, request);
  return data;
}

export async function deleteReleaseTemplate(id: string): Promise<void> {
  await apiClient.delete(`/release-templates/${id}`);
}
