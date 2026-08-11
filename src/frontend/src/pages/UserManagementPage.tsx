import { useState } from 'react';
import { Button, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useSetUserEnabled,
  useUpdateUserRoles,
  useUsers,
} from '../hooks/useUsers';
import { UserTable } from '../components/domain/UserTable';
import { UserFormModal } from '../components/domain/UserFormModal';
import { EditRolesModal } from '../components/domain/EditRolesModal';
import { ResetPasswordModal } from '../components/domain/ResetPasswordModal';
import type { AppRole } from '../types/auth';
import type { UserSummary } from '../types/user';

type Confirm = { kind: 'disable' | 'delete'; user: UserSummary } | null;

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function UserManagementPage() {
  const { t } = useTranslation(['users', 'common']);
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();

  const createUser = useCreateUser();
  const updateRoles = useUpdateUserRoles();
  const resetPassword = useResetUserPassword();
  const setEnabled = useSetUserEnabled();
  const deleteUser = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [rolesUser, setRolesUser] = useState<UserSummary | null>(null);
  const [resetUser, setResetUser] = useState<UserSummary | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const notifyError = (error: unknown, fallback: string) =>
    notifications.show({ color: 'nordRed', message: errorMessage(error, fallback) });

  const handleCreate = (request: Parameters<typeof createUser.mutate>[0]) => {
    createUser.mutate(request, {
      onSuccess: () => {
        notifications.show({ color: 'nordGreen', message: t('create.success') });
        setCreateOpen(false);
      },
      onError: (error) => notifyError(error, t('create.failed')),
    });
  };

  const handleEditRoles = (roles: AppRole[]) => {
    if (!rolesUser) return;
    updateRoles.mutate(
      { id: rolesUser.id, request: { roles } },
      {
        onSuccess: () => {
          notifications.show({ color: 'nordGreen', message: t('roles.success') });
          setRolesUser(null);
        },
        onError: (error) => notifyError(error, t('roles.failed')),
      },
    );
  };

  const handleResetPassword = (newPassword: string) => {
    if (!resetUser) return;
    resetPassword.mutate(
      { id: resetUser.id, request: { newPassword } },
      {
        onSuccess: () => {
          notifications.show({ color: 'nordGreen', message: t('reset.success') });
          setResetUser(null);
        },
        onError: (error) => notifyError(error, t('reset.failed')),
      },
    );
  };

  const handleToggleEnabled = (target: UserSummary) => {
    if (target.isEnabled) {
      setConfirm({ kind: 'disable', user: target });
      return;
    }
    setEnabled.mutate(
      { id: target.id, enabled: true },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('enable.success') }),
        onError: (error) => notifyError(error, t('enable.failed')),
      },
    );
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    if (kind === 'disable') {
      setEnabled.mutate(
        { id: user.id, enabled: false },
        {
          onSuccess: () => {
            notifications.show({ color: 'nordGreen', message: t('disable.success') });
            setConfirm(null);
          },
          onError: (error) => notifyError(error, t('disable.failed')),
        },
      );
    } else {
      deleteUser.mutate(user.id, {
        onSuccess: () => {
          notifications.show({ color: 'nordGreen', message: t('delete.success') });
          setConfirm(null);
        },
        onError: (error) => notifyError(error, t('delete.failed')),
      });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{t('title')}</Title>
          <Text c="dimmed" size="sm">
            {t('subtitle')}
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setCreateOpen(true)}>
          {t('actions.create')}
        </Button>
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : users && users.length > 0 ? (
        <UserTable
          users={users}
          currentUserId={currentUser?.id ?? ''}
          onEditRoles={setRolesUser}
          onResetPassword={setResetUser}
          onToggleEnabled={handleToggleEnabled}
          onDelete={(u) => setConfirm({ kind: 'delete', user: u })}
        />
      ) : (
        <Text c="dimmed">{t('table.noUsers')}</Text>
      )}

      <UserFormModal
        opened={createOpen}
        loading={createUser.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <EditRolesModal
        user={rolesUser}
        loading={updateRoles.isPending}
        onClose={() => setRolesUser(null)}
        onSubmit={handleEditRoles}
      />
      <ResetPasswordModal
        user={resetUser}
        loading={resetPassword.isPending}
        onClose={() => setResetUser(null)}
        onSubmit={handleResetPassword}
      />

      <Modal
        opened={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? t(`${confirm.kind}.confirmTitle`) : ''}
        centered
      >
        <Stack gap="md">
          <Text>
            {confirm ? t(`${confirm.kind}.confirmMessage`, { email: confirm.user.email }) : ''}
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setConfirm(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              color="nordRed"
              loading={setEnabled.isPending || deleteUser.isPending}
              onClick={handleConfirm}
            >
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
