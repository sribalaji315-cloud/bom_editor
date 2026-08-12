import { useState } from 'react';
import { Button, Code, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useTranslateExpression } from '../../hooks/useAi';
import type { AiContext, AiFieldType } from '../../types/ai';

interface AiTranslateModalProps {
  opened: boolean;
  context: AiContext;
  fieldType: AiFieldType;
  initialText?: string;
  onClose: () => void;
  onApply: (expression: string) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function AiTranslateModal({
  opened,
  context,
  fieldType,
  initialText,
  onClose,
  onApply,
}: AiTranslateModalProps) {
  const { t } = useTranslation(['ai']);
  const translate = useTranslateExpression();
  const [text, setText] = useState(initialText ?? '');
  const [result, setResult] = useState('');

  const fieldLabel = fieldType === 'formula' ? t('translate.formula') : t('translate.condition');

  const handleClose = () => {
    setText('');
    setResult('');
    translate.reset();
    onClose();
  };

  const handleTranslate = () => {
    if (!text.trim()) {
      notifications.show({ color: 'nordAmber', message: t('translate.empty') });
      return;
    }
    translate.mutate(
      { context, fieldType, naturalLanguage: text.trim() },
      {
        onSuccess: (response) => setResult(response.expression),
        onError: (error) =>
          notifications.show({ color: 'nordRed', message: errorMessage(error, t('translate.failed')) }),
      },
    );
  };

  const handleApply = () => {
    onApply(result);
    handleClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={t('translate.title')} size="lg">
      <Stack gap="md">
        <Textarea
          label={t('translate.prompt')}
          placeholder={t('translate.promptPlaceholder')}
          autosize
          minRows={3}
          maxRows={8}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button
            variant="light"
            leftSection={<IconSparkles size={16} />}
            loading={translate.isPending}
            onClick={handleTranslate}
          >
            {t('translate.run')}
          </Button>
        </Group>

        {result && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t('translate.result', { field: fieldLabel })}
            </Text>
            <Code block>{result}</Code>
            <Group justify="flex-end">
              <Button onClick={handleApply}>{t('translate.apply')}</Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
