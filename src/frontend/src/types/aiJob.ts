import type { AiContext, AiFieldType, AiProvider } from './ai';

export type AiJobStatus = 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

export interface AiTranslationJobItem {
  id: string;
  lineId: string;
  fieldType: AiFieldType;
  sourceText: string;
  expression: string | null;
  error: string | null;
  appliedAt: string | null;
}

export interface AiTranslationJob {
  id: string;
  context: AiContext;
  targetId: string;
  status: AiJobStatus;
  provider: AiProvider | null;
  model: string | null;
  requestedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  /** Jobs ahead of this one while it waits; 0 once it is running or finished. */
  queuePosition: number;
  error: string | null;
  items: AiTranslationJobItem[];
}

export interface CreateTranslationJobRequest {
  context: AiContext;
  targetId: string;
  items: { lineId: string; fieldType: AiFieldType; naturalLanguage: string }[];
}

export interface ApplyTranslationJobResult {
  applied: number;
  skipped: number;
}

export const JOB_IN_PROGRESS: AiJobStatus[] = ['Queued', 'Running'];
