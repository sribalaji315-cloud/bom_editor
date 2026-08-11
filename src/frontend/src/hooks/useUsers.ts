import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  setUserEnabled,
  updateUserRoles,
} from '../api/users';
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRolesRequest,
} from '../types/user';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.lists(),
    queryFn: getUsers,
  });
}

function useUsersInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function useCreateUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: invalidate,
  });
}

export function useUpdateUserRoles() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateUserRolesRequest }) =>
      updateUserRoles(id, request),
    onSuccess: invalidate,
  });
}

export function useSetUserEnabled() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setUserEnabled(id, enabled),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ResetPasswordRequest }) =>
      resetUserPassword(id, request),
  });
}

export function useDeleteUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
  });
}
