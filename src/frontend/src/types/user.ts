import type { AppRole } from './auth';

export const ALL_ROLES: AppRole[] = ['Manufacturing', 'DataSpecialist', 'Admin', 'Engineering'];

export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  isEnabled: boolean;
  roles: AppRole[];
}

export interface CreateUserRequest {
  email: string;
  displayName: string | null;
  password: string;
  roles: AppRole[];
}

export interface UpdateUserRolesRequest {
  roles: AppRole[];
}

export interface ResetPasswordRequest {
  newPassword: string;
}
