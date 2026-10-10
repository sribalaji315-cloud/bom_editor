import { apiClient } from './client';
import type {
  AiTranslationJob,
  ApplyTranslationJobResult,
  CreateTranslationJobRequest,
} from '../types/aiJob';

export async function createTranslationJob(
  request: CreateTranslationJobRequest,
): Promise<AiTranslationJob> {
  const { data } = await apiClient.post<AiTranslationJob>('/ai/translate-jobs', request);
  return data;
}

export async function getTranslationJob(jobId: string): Promise<AiTranslationJob> {
  const { data } = await apiClient.get<AiTranslationJob>(`/ai/translate-jobs/${jobId}`);
  return data;
}

/** 204 when the document has never had a run; the hook treats that as null. */
export async function getLatestTranslationJob(targetId: string): Promise<AiTranslationJob | null> {
  const { data } = await apiClient.get<AiTranslationJob | ''>('/ai/translate-jobs', {
    params: { targetId },
  });
  return data === '' ? null : data;
}

export async function cancelTranslationJob(jobId: string): Promise<void> {
  await apiClient.post(`/ai/translate-jobs/${jobId}/cancel`);
}

export async function applyTranslationJob(
  jobId: string,
  itemIds: string[],
): Promise<ApplyTranslationJobResult> {
  const { data } = await apiClient.post<ApplyTranslationJobResult>(
    `/ai/translate-jobs/${jobId}/apply`,
    { itemIds },
  );
  return data;
}
