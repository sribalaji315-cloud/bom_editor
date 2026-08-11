export type AppRole = 'Manufacturing' | 'DataSpecialist' | 'Admin' | 'Engineering';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: AppRole[];
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
