import { useState } from 'react';
import { Button, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useCreateReleaseTemplate,
  useDeleteReleaseTemplate,
  useReleaseTemplates,
  useUpdateReleaseTemplate,
} from '../hooks/useReleaseTemplates';
import { ReleaseTemplateTable } from '../components/domain/ReleaseTemplateTable';
import {
  ReleaseTemplateFormModal,
  type ReleaseTemplateFormValues,
} from '../components/domain/ReleaseTemplateFormModal';
import type { ReleaseTemplate } from '../types/releaseTemplate';

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function ReleaseTemplatesPage() {
  const { t } = useTranslation(['releaseTemplates', 'common']);
  const { data: templates, isLoading } = useReleaseTemplates();

  const createTemplate = useCreateReleaseTemplate();
  const updateTemplate = useUpdateReleaseTemplate();
  const deleteTemplate = useDeleteReleaseTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReleaseTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReleaseTemplate | null>(null);

  const notifyError = (error: unknown, fallback: string) =>
    notifications.show({ color: 'nordRed', message: errorMessage(error, fallback) });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (template: ReleaseTemplate) => {
    setEditing(template);
    setFormOpen(true);
  };

  const handleSubmit = (values: ReleaseTemplateFormValues) => {
    if (editing) {
      updateTemplate.mutate(
        { id: editing.id, request: values },
        {
          onSuccess: () => {
            notifications.show({ color: 'nordGreen', message: t('form.updateSuccess') });
            setFormOpen(false);
          },
          onError: (error) => notifyError(error, t('form.updateFailed')),
        },
      );
    } else {
      createTemplate.mutate(
        { name: values.name },
        {
          onSuccess: () => {
            notifications.show({ color: 'nordGreen', message: t('form.createSuccess') });
            setFormOpen(false);
          },
          onError: (error) => notifyError(error, t('form.createFailed')),
        },
      );
    }
  };

  const handleToggleActive = (template: ReleaseTemplate) => {
    const next = !template.isActive;
    updateTemplate.mutate(
      { id: template.id, request: { name: template.name, isActive: next } },
      {
        onSuccess: () =>
          notifications.show({
            color: 'nordGreen',
            message: t(next ? 'activate.success' : 'deactivate.success'),
          }),
        onError: (error) =>
          notifyError(error, t(next ? 'activate.failed' : 'deactivate.failed')),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteTemplate.mutate(pendingDelete.id, {
      onSuccess: () => {
        notifications.show({ color: 'nordGreen', message: t('delete.success') });
        setPendingDelete(null);
      },
      onError: (error) => notifyError(error, t('delete.failed')),
    });
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
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          {t('actions.create')}
        </Button>
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : templates && templates.length > 0 ? (
        <ReleaseTemplateTable
          templates={templates}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onDelete={setPendingDelete}
        />
      ) : (
        <Text c="dimmed">{t('table.empty')}</Text>
      )}

      <ReleaseTemplateFormModal
        opened={formOpen}
        template={editing}
        loading={createTemplate.isPending || updateTemplate.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('delete.confirmTitle')}
        centered
      >
        <Stack gap="md">
          <Text>{pendingDelete ? t('delete.confirmMessage', { name: pendingDelete.name }) : ''}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setPendingDelete(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" loading={deleteTemplate.isPending} onClick={handleConfirmDelete}>
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
