import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface OperationRequestValues {
  code: string;
  description: string;
  reason: string | null;
}

interface OperationRequestModalProps {
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: OperationRequestValues) => void;
}

export function OperationRequestModal({
  opened,
  loading,
  onClose,
  onSubmit,
}: OperationRequestModalProps) {
  const { t } = useTranslation(['operations', 'common']);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the fields each time the modal opens (render-time state adjustment).
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setCode('');
      setDescription('');
      setReason('');
    }
  }

  const canSubmit = code.trim().length > 0 && description.trim().length > 0;

  return (
    <Modal opened={opened} onClose={onClose} title={t('request.title')} centered>
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="nordFrost" variant="light">
          {t('request.info')}
        </Alert>
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
        <Textarea
          label={t('request.reason')}
          placeholder={t('request.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          autosize
          minRows={3}
          maxRows={6}
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                code: code.trim(),
                description: description.trim(),
                reason: reason.trim() || null,
              })
            }
            loading={loading}
            disabled={!canSubmit}
          >
            {t('request.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
