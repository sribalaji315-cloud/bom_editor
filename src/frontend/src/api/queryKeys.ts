export const queryKeys = {
  boms: {
    all: ['boms'] as const,
    lists: () => [...queryKeys.boms.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.boms.all, 'detail', id] as const,
    audit: (id: string) => [...queryKeys.boms.all, 'audit', id] as const,
    versions: (id: string) => [...queryKeys.boms.all, 'versions', id] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
  },
  releaseTemplates: {
    all: ['release-templates'] as const,
    lists: () => [...queryKeys.releaseTemplates.all, 'list'] as const,
  },
  operations: {
    all: ['operations'] as const,
    lists: () => [...queryKeys.operations.all, 'list'] as const,
    selectable: () => [...queryKeys.operations.all, 'selectable'] as const,
  },
  validation: {
    all: ['validation'] as const,
    rules: () => [...queryKeys.validation.all, 'rules'] as const,
    metadata: () => [...queryKeys.validation.all, 'metadata'] as const,
  },
  routes: {
    all: ['routes'] as const,
    lists: () => [...queryKeys.routes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.routes.all, 'detail', id] as const,
    audit: (id: string) => [...queryKeys.routes.all, 'audit', id] as const,
    codes: () => [...queryKeys.routes.all, 'codes'] as const,
  },
  ai: {
    all: ['ai'] as const,
    settings: () => [...queryKeys.ai.all, 'settings'] as const,
    job: (id: string) => [...queryKeys.ai.all, 'job', id] as const,
    jobForTarget: (targetId: string) => [...queryKeys.ai.all, 'job', 'target', targetId] as const,
  },
};
