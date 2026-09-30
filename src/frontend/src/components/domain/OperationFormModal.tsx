import { useState } from 'react';
import { Button, Group, Modal, Stack, Switch, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Operation } from '../../types/operation';

export interface OperationFormValues {
  code: string;
  description: string;
  isActive: boolean;
}

interface OperationFormModalProps {
  opened: boolean;
  // When editing, the operation being edited; null when creating.
  operation: Operation | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: OperationFormValues) => void;
}

export function OperationFormModal({
  opened,
  operation,
  loading,
  onClose,
  onSubmit,
}: OperationFormModalProps) {
  const { t } = useTranslation(['operations', 'common']);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [wasOpen, setWasOpen] = useState(false);

  // Seed the fields each time the modal opens (render-time state adjustment).
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setCode(operation?.code ?? '');
      setDescription(operation?.description ?? '');
      setIsActive(operation?.isActive ?? true);
    }
  }

  const isEdit = operation !== null;
  const canSubmit = code.trim().length > 0 && description.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(isEdit ? 'form.editTitle' : 'form.createTitle')}
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t('form.code')}
          placeholder={t('form.codePlaceholder')}
          required
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
        <TextInput
          label={t('form.description')}
          placeholder={t('form.descriptionPlaceholder')}
          required
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
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
            onClick={() =>
              onSubmit({ code: code.trim(), description: description.trim(), isActive })
            }
            loading={loading}
            disabled={!canSubmit}
          >
            {t('form.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
