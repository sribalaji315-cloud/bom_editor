import { useState } from 'react';
import { Button, Group, Modal, Stack, Switch, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ReleaseTemplate } from '../../types/releaseTemplate';

export interface ReleaseTemplateFormValues {
  name: string;
  isActive: boolean;
}

interface ReleaseTemplateFormModalProps {
  opened: boolean;
  // When editing, the template being edited; null when creating.
  template: ReleaseTemplate | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: ReleaseTemplateFormValues) => void;
}

export function ReleaseTemplateFormModal({
  opened,
  template,
  loading,
  onClose,
  onSubmit,
}: ReleaseTemplateFormModalProps) {
  const { t } = useTranslation(['releaseTemplates', 'common']);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [wasOpen, setWasOpen] = useState(false);

  // Seed the fields each time the modal opens (render-time state adjustment).
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setName(template?.name ?? '');
      setIsActive(template?.isActive ?? true);
    }
  }

  const isEdit = template !== null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(isEdit ? 'form.editTitle' : 'form.createTitle')}
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t('form.name')}
          placeholder={t('form.namePlaceholder')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {isEdit && (
          <Switch
            label={t('form.active')}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={() => onSubmit({ name: name.trim(), isActive })}
            loading={loading}
            disabled={!name.trim()}
          >
            {t('form.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
