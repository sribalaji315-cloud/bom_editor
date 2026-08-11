import { apiClient } from './client';
import type {
  AiProvider,
  AiSettings,
  TestProviderResponse,
  TranslateRequest,
  TranslateResponse,
  UpdateAiSettingsRequest,
} from '../types/ai';

export async function getAiSettings(): Promise<AiSettings> {
  const { data } = await apiClient.get<AiSettings>('/ai/settings');
  return data;
}

export async function updateAiSettings(request: UpdateAiSettingsRequest): Promise<AiSettings> {
  const { data } = await apiClient.put<AiSettings>('/ai/settings', request);
  return data;
}

export async function uploadGrounding(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await apiClient.post('/ai/upload-grounding', form);
}

export async function testProvider(provider: AiProvider): Promise<TestProviderResponse> {
  const { data } = await apiClient.post<TestProviderResponse>('/ai/test', { provider });
  return data;
}

export async function translateExpression(request: TranslateRequest): Promise<TranslateResponse> {
  const { data } = await apiClient.post<TranslateResponse>('/ai/translate', request);
  return data;
}
