import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  getAiSettings,
  testProvider,
  translateExpression,
  updateAiSettings,
  uploadGrounding,
} from '../api/ai';
import type { AiProvider, TranslateRequest, UpdateAiSettingsRequest } from '../types/ai';

export function useAiSettings() {
  return useQuery({ queryKey: queryKeys.ai.settings(), queryFn: getAiSettings });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateAiSettingsRequest) => updateAiSettings(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ai.all }),
  });
}

export function useUploadGrounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadGrounding(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ai.all }),
  });
}

export function useTestProvider() {
  return useMutation({ mutationFn: (provider: AiProvider) => testProvider(provider) });
}

export function useTranslateExpression() {
  return useMutation({ mutationFn: (request: TranslateRequest) => translateExpression(request) });
}
