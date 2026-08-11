import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
} from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet, IconPlus, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useRoutes } from '../hooks/useRoutes';
import { useCreateRoute, useDeleteRoute, useImportRoutes } from '../hooks/useRouteOperations';
import { useAuth } from '../context/AuthContext';
import type { RouteSummary } from '../types/route';

export function RouteListPage() {
  const { t } = useTranslation(['route', 'common', 'errors']);
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: routes, isLoading } = useRoutes();
  const importRoutes = useImportRoutes();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();

  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RouteSummary | null>(null);

  const handleDrop = (files: FileWithPath[]) => {
    const file = files[0];
    if (!file) return;
    importRoutes.mutate(file, {
      onSuccess: (result) =>
        notifications.show({
          color: 'nordGreen',
          message: t('import.success', {
            created: result.created,
            updated: result.updated,
            operations: result.totalOperations,
          }),
        }),
      onError: (error) => {
        const message =
          (error as { response?: { data?: string } })?.response?.data ?? t('import.failed');
        notifications.show({ color: 'nordRed', message });
      },
    });
  };

  const handleCreate = () => {
    createRoute.mutate(
      {
        code: code.trim(),
        name: name.trim() || null,
        routeNumber: null,
        isActive: true,
      },
      {
        onSuccess: (route) => {
          notifications.show({ color: 'nordGreen', message: t('create.success') });
          setCreateOpen(false);
          setCode('');
          setName('');
          navigate(`/routes/${route.id}`);
        },
        onError: (error) => {
          const message =
            (error as { response?: { data?: string } })?.response?.data ?? t('create.failed');
          notifications.show({ color: 'nordRed', message });
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRoute.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => notifications.show({ color: 'nordRed', message: t('editor.saveFailed') }),
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('list.title')}</Title>
        {canEdit && (
          <Button
            color="nordGreen"
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('create.title')}
          </Button>
        )}
      </Group>

      {canEdit && (
        <Card withBorder padding="lg">
          <Stack gap="md">
            <Title order={4}>{t('import.title')}</Title>
            <Dropzone
              onDrop={handleDrop}
              accept={['text/csv', 'application/vnd.ms-excel']}
              loading={importRoutes.isPending}
              maxFiles={1}
            >
              <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload style={{ width: rem(42), height: rem(42) }} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX style={{ width: rem(42), height: rem(42) }} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileSpreadsheet style={{ width: rem(42), height: rem(42) }} />
                </Dropzone.Idle>
                <div>
                  <Text size="lg">{t('import.dropzone')}</Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {t('import.dropzoneHint')}
                  </Text>
                </div>
              </Group>
            </Dropzone>
          </Stack>
        </Card>
      )}

      {isLoading ? (
        <Text c="dimmed">{t('loading', { ns: 'common' })}</Text>
      ) : !routes || routes.length === 0 ? (
        <Text c="dimmed">{t('list.empty')}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {routes.map((route) => (
            <Card
              key={route.id}
              withBorder
              padding="lg"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/routes/${route.id}`)}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600}>{route.code}</Text>
                  <Group gap="xs" wrap="nowrap">
                    <Badge color="nordFrost" variant="light">
                      {t('list.operationCount', { count: route.operationCount })}
                    </Badge>
                    {canEdit && (
                      <ActionIcon
                        variant="subtle"
                        color="nordRed"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(route);
                        }}
                        aria-label={t('editor.deleteRoute')}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
                {route.name && <Text size="sm">{route.name}</Text>}
                {!route.isActive && (
                  <Badge color="nordAmber" variant="light" w="fit-content">
                    {t('list.inactive')}
                  </Badge>
                )}
                {route.createdBy && (
                  <Text size="sm" c="dimmed">
                    {t('list.createdBy', { name: route.createdBy })}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  {t('list.updated', { when: new Date(route.updatedAt).toLocaleString() })}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title={t('create.title')}>
        <Stack gap="md">
          <TextInput
            label={t('create.code')}
            placeholder={t('create.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            required
          />
          <TextInput
            label={t('create.name')}
            placeholder={t('create.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              color="nordGreen"
              onClick={handleCreate}
              disabled={code.trim().length === 0}
              loading={createRoute.isPending}
            >
              {t('create.submit')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('editor.deleteRoute')}
      >
        <Stack gap="md">
          <Text>{t('editor.deleteRouteConfirm')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingDelete(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" onClick={confirmDelete} loading={deleteRoute.isPending}>
              {t('actions.delete', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
