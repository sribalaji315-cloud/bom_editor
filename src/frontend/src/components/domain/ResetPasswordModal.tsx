import { useState } from 'react';
import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '../../types/user';

interface ResetPasswordModalProps {
  user: UserSummary | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
}

export function ResetPasswordModal({ user, loading, onClose, onSubmit }: ResetPasswordModalProps) {
  const { t } = useTranslation(['users', 'common']);
  const [password, setPassword] = useState('');
  const [lastUser, setLastUser] = useState<UserSummary | null>(null);

  // Clear the field whenever a different user is opened (render-time state adjustment).
  if (user !== lastUser) {
    setLastUser(user);
    setPassword('');
  }

  return (
    <Modal opened={!!user} onClose={onClose} title={t('reset.title')} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('reset.description', { email: user?.email ?? '' })}
        </Text>
        <PasswordInput
          label={t('reset.newPassword')}
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button onClick={() => onSubmit(password)} loading={loading} disabled={!password}>
            {t('reset.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
