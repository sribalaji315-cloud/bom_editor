import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  applyTranslationJob,
  cancelTranslationJob,
  createTranslationJob,
  getLatestTranslationJob,
} from '../api/aiJobs';
import type { CreateTranslationJobRequest } from '../types/aiJob';
import { JOB_IN_PROGRESS } from '../types/aiJob';

/** Polls while the run is queued or in progress, then falls back to a normal cached query. */
export function useLatestTranslationJob(targetId: string) {
  return useQuery({
    queryKey: queryKeys.ai.jobForTarget(targetId),
    queryFn: () => getLatestTranslationJob(targetId),
    enabled: Boolean(targetId),
    refetchInterval: (query) =>
      query.state.data && JOB_IN_PROGRESS.includes(query.state.data.status) ? 3000 : false,
  });
}

export function useCreateTranslationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTranslationJobRequest) => createTranslationJob(request),
    onSuccess: (job) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.jobForTarget(job.targetId) }),
  });
}

export function useCancelTranslationJob(targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelTranslationJob(jobId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.jobForTarget(targetId) }),
  });
}

export function useApplyTranslationJob(targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, itemIds }: { jobId: string; itemIds: string[] }) =>
      applyTranslationJob(jobId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.jobForTarget(targetId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.boms.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    },
  });
}
