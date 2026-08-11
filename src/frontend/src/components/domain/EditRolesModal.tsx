import { useState } from 'react';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { AppRole } from '../../types/auth';
import type { UserSummary } from '../../types/user';
import { RoleMultiSelect } from './RoleMultiSelect';

interface EditRolesModalProps {
  user: UserSummary | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (roles: AppRole[]) => void;
}

export function EditRolesModal({ user, loading, onClose, onSubmit }: EditRolesModalProps) {
  const { t } = useTranslation(['users', 'common']);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [lastUser, setLastUser] = useState<UserSummary | null>(null);

  // Seed the selection whenever a different user is opened (render-time state adjustment).
  if (user !== lastUser) {
    setLastUser(user);
    setRoles(user ? user.roles : []);
  }

  return (
    <Modal opened={!!user} onClose={onClose} title={t('roles.title')} centered>
      <Stack gap="md">
        <RoleMultiSelect label={t('roles.label')} value={roles} onChange={setRoles} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button onClick={() => onSubmit(roles)} loading={loading}>
            {t('roles.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
