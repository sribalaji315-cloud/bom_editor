import { useState } from 'react';
import { ActionIcon, Button, Group, Loader, Modal, Stack, Text, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHelp, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useCreateValidationRule,
  useDeleteValidationRule,
  useUpdateValidationRule,
  useValidationMetadata,
  useValidationRules,
} from '../hooks/useValidation';
import { ValidationRuleTable } from '../components/domain/ValidationRuleTable';
import { ValidationHelpPanel } from '../components/domain/ValidationHelpPanel';
import {
  ValidationRuleFormModal,
  type ValidationRuleFormValues,
} from '../components/domain/ValidationRuleFormModal';
import type { ValidationRule } from '../types/validation';

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function ValidationRulesPage() {
  const { t } = useTranslation(['validation', 'common']);
  const { data: rules, isLoading } = useValidationRules();
  const { data: metadata } = useValidationMetadata();

  const createRule = useCreateValidationRule();
  const updateRule = useUpdateValidationRule();
  const deleteRule = useDeleteValidationRule();

  const [formOpen, setFormOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editing, setEditing] = useState<ValidationRule | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ValidationRule | null>(null);

  const notifyError = (error: unknown, fallback: string) =>
    notifications.show({ color: 'nordRed', message: errorMessage(error, fallback) });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (rule: ValidationRule) => {
    setEditing(rule);
    setFormOpen(true);
  };

  const handleSubmit = (values: ValidationRuleFormValues) => {
    if (editing) {
      updateRule.mutate(
        { id: editing.id, request: values },
        {
          onSuccess: () => {
            notifications.show({ color: 'nordGreen', message: t('rules.form.updateSuccess') });
            setFormOpen(false);
          },
          onError: (error) => notifyError(error, t('rules.form.updateFailed')),
        },
      );
    } else {
      createRule.mutate(values, {
        onSuccess: () => {
          notifications.show({ color: 'nordGreen', message: t('rules.form.createSuccess') });
          setFormOpen(false);
        },
        onError: (error) => notifyError(error, t('rules.form.createFailed')),
      });
    }
  };

  const handleToggleActive = (rule: ValidationRule) => {
    updateRule.mutate(
      { id: rule.id, request: { ...rule, isActive: !rule.isActive } },
      { onError: (error) => notifyError(error, t('rules.form.updateFailed')) },
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteRule.mutate(pendingDelete.id, {
      onSuccess: () => {
        notifications.show({ color: 'nordGreen', message: t('rules.delete.success') });
        setPendingDelete(null);
      },
      onError: (error) => notifyError(error, t('rules.delete.failed')),
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{t('rules.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('rules.subtitle')}
          </Text>
        </div>
        <Group gap="xs">
          <Tooltip label={t('actions.help', { ns: 'common' })}>
            <ActionIcon variant="light" size="lg" onClick={() => setHelpOpen(true)}>
              <IconHelp size={18} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t('rules.actions.create')}
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : rules && rules.length > 0 ? (
        <ValidationRuleTable
          rules={rules}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onDelete={setPendingDelete}
        />
      ) : (
        <Text c="dimmed">{t('rules.empty')}</Text>
      )}

      <ValidationRuleFormModal
        opened={formOpen}
        rule={editing}
        metadata={metadata}
        loading={createRule.isPending || updateRule.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ValidationHelpPanel
        opened={helpOpen}
        metadata={metadata}
        onClose={() => setHelpOpen(false)}
      />

      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('rules.delete.confirmTitle')}
        centered
      >
        <Stack gap="md">
          <Text>
            {pendingDelete ? t('rules.delete.confirmMessage', { name: pendingDelete.name }) : ''}
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setPendingDelete(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" loading={deleteRule.isPending} onClick={handleConfirmDelete}>
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
