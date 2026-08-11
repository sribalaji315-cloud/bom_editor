import { apiClient } from './client';
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRolesRequest,
  UserSummary,
} from '../types/user';

export async function getUsers(): Promise<UserSummary[]> {
  const { data } = await apiClient.get<UserSummary[]>('/users');
  return data;
}

export async function createUser(request: CreateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.post<UserSummary>('/users', request);
  return data;
}

export async function updateUserRoles(
  id: string,
  request: UpdateUserRolesRequest,
): Promise<UserSummary> {
  const { data } = await apiClient.put<UserSummary>(`/users/${id}/roles`, request);
  return data;
}

export async function setUserEnabled(id: string, enabled: boolean): Promise<UserSummary> {
  const { data } = await apiClient.put<UserSummary>(`/users/${id}/enabled`, { enabled });
  return data;
}

export async function resetUserPassword(id: string, request: ResetPasswordRequest): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, request);
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
