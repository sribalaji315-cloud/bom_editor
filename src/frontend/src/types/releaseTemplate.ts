export interface ReleaseTemplate {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CreateReleaseTemplateRequest {
  name: string;
}

export interface UpdateReleaseTemplateRequest {
  name: string;
  isActive: boolean;
}
