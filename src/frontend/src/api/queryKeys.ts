export const queryKeys = {
  boms: {
    all: ['boms'] as const,
    lists: () => [...queryKeys.boms.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.boms.all, 'detail', id] as const,
    audit: (id: string) => [...queryKeys.boms.all, 'audit', id] as const,
  },
  routes: {
    all: ['routes'] as const,
    lists: () => [...queryKeys.routes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.routes.all, 'detail', id] as const,
    audit: (id: string) => [...queryKeys.routes.all, 'audit', id] as const,
    codes: () => [...queryKeys.routes.all, 'codes'] as const,
  },
  releaseTemplates: {
    all: ['releaseTemplates'] as const,
    lists: () => [...queryKeys.releaseTemplates.all, 'list'] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
  },
  ai: {
    all: ['ai'] as const,
    settings: () => [...queryKeys.ai.all, 'settings'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
};
