import { useState } from 'react';
import { Button, Group, Modal, PasswordInput, Stack, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { AppRole } from '../../types/auth';
import type { CreateUserRequest } from '../../types/user';
import { RoleMultiSelect } from './RoleMultiSelect';

interface UserFormModalProps {
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (request: CreateUserRequest) => void;
}

export function UserFormModal({ opened, loading, onClose, onSubmit }: UserFormModalProps) {
  const { t } = useTranslation(['users', 'common']);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the form each time the modal transitions to open (render-time state adjustment).
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setEmail('');
      setDisplayName('');
      setPassword('');
      setRoles([]);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = () => {
    onSubmit({
      email: email.trim(),
      displayName: displayName.trim() || null,
      password,
      roles,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('create.title')} centered>
      <Stack gap="md">
        <TextInput
          label={t('create.email')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <TextInput
          label={t('create.displayName')}
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
        />
        <PasswordInput
          label={t('create.password')}
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <RoleMultiSelect label={t('create.roles')} value={roles} onChange={setRoles} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!canSubmit}>
            {t('create.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
