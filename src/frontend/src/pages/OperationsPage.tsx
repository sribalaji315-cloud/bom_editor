import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useApproveOperation,
  useCreateOperation,
  useDeleteOperation,
  useOperations,
  useRejectOperation,
  useRequestOperation,
  useUpdateOperation,
} from '../hooks/useOperations';
import { OperationTable } from '../components/domain/OperationTable';
import {
  OperationFormModal,
  type OperationFormValues,
} from '../components/domain/OperationFormModal';
import {
  OperationRequestModal,
  type OperationRequestValues,
} from '../components/domain/OperationRequestModal';
import { useAuth } from '../context/AuthContext';
import type { Operation } from '../types/operation';

type Tab = 'pending' | 'all';

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function OperationsPage() {
  const { t } = useTranslation(['operations', 'common']);
  const { canEdit } = useAuth();
  const { data: operations, isLoading } = useOperations();

  const createOperation = useCreateOperation();
  const requestOperation = useRequestOperation();
  const updateOperation = useUpdateOperation();
  const approveOperation = useApproveOperation();
  const rejectOperation = useRejectOperation();
  const deleteOperation = useDeleteOperation();

  const [tab, setTab] = useState<Tab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Operation | null>(null);
  const [pendingReject, setPendingReject] = useState<Operation | null>(null);

  const pendingCount = useMemo(
    () => operations?.filter((o) => o.status === 'Requested').length ?? 0,
    [operations],
  );

  const visible = useMemo(() => {
    if (!operations) return [];
    return tab === 'pending' ? operations.filter((o) => o.status === 'Requested') : operations;
  }, [operations, tab]);

  const notifyError = (error: unknown, fallback: string) =>
    notifications.show({ color: 'nordRed', message: errorMessage(error, fallback) });

  const notifyOk = (message: string) =>
    notifications.show({ color: 'nordGreen', message });

  const handleSubmit = (values: OperationFormValues) => {
    if (editing) {
      updateOperation.mutate(
        { id: editing.id, request: values },
        {
          onSuccess: () => {
            notifyOk(t('form.updateSuccess'));
            setFormOpen(false);
          },
          onError: (error) => notifyError(error, t('form.updateFailed')),
        },
      );
    } else {
      createOperation.mutate(
        { code: values.code, description: values.description },
        {
          onSuccess: () => {
            notifyOk(t('form.createSuccess'));
            setFormOpen(false);
          },
          onError: (error) => notifyError(error, t('form.createFailed')),
        },
      );
    }
  };

  const handleRequest = (values: OperationRequestValues) => {
    requestOperation.mutate(values, {
      onSuccess: () => {
        notifyOk(t('request.success'));
        setRequestOpen(false);
      },
      onError: (error) => notifyError(error, t('request.failed')),
    });
  };

  const handleApprove = (operation: Operation) => {
    approveOperation.mutate(
      { id: operation.id, request: { code: null, description: null } },
      {
        onSuccess: () => notifyOk(t('review.approved')),
        onError: (error) => notifyError(error, t('review.approveFailed')),
      },
    );
  };

  const handleToggleActive = (operation: Operation) => {
    const next = !operation.isActive;
    updateOperation.mutate(
      {
        id: operation.id,
        request: { code: operation.code, description: operation.description, isActive: next },
      },
      {
        onSuccess: () => notifyOk(t(next ? 'activate.success' : 'deactivate.success')),
        onError: (error) => notifyError(error, t(next ? 'activate.failed' : 'deactivate.failed')),
      },
    );
  };

  const confirmReject = () => {
    if (!pendingReject) return;
    rejectOperation.mutate(pendingReject.id, {
      onSuccess: () => {
        notifyOk(t('review.rejected'));
        setPendingReject(null);
      },
      onError: (error) => notifyError(error, t('review.rejectFailed')),
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteOperation.mutate(pendingDelete.id, {
      onSuccess: () => {
        notifyOk(t('delete.success'));
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
        <Group gap="sm">
          <Button variant="light" onClick={() => setRequestOpen(true)}>
            {t('request.title')}
          </Button>
          {canEdit && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('actions.create')}
            </Button>
          )}
        </Group>
      </Group>

      <Group>
        <SegmentedControl
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          data={[
            { value: 'all', label: t('tabs.all') },
            { value: 'pending', label: t('tabs.pending') },
          ]}
        />
        {pendingCount > 0 && (
          <Badge color="nordAmber" variant="light">
            {t('tabs.pendingCount', { count: pendingCount })}
          </Badge>
        )}
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : visible.length > 0 ? (
        <OperationTable
          operations={visible}
          canEdit={canEdit}
          onEdit={(operation) => {
            setEditing(operation);
            setFormOpen(true);
          }}
          onApprove={handleApprove}
          onReject={setPendingReject}
          onToggleActive={handleToggleActive}
          onDelete={setPendingDelete}
        />
      ) : (
        <Text c="dimmed">{t(tab === 'pending' ? 'table.noPending' : 'table.empty')}</Text>
      )}

      <OperationFormModal
        opened={formOpen}
        operation={editing}
        loading={createOperation.isPending || updateOperation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <OperationRequestModal
        opened={requestOpen}
        loading={requestOperation.isPending}
        onClose={() => setRequestOpen(false)}
        onSubmit={handleRequest}
      />

      <Modal
        opened={!!pendingReject}
        onClose={() => setPendingReject(null)}
        title={t('review.rejectTitle')}
        centered
      >
        <Stack gap="md">
          <Text>{pendingReject ? t('review.rejectMessage', { code: pendingReject.code }) : ''}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setPendingReject(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" loading={rejectOperation.isPending} onClick={confirmReject}>
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('delete.confirmTitle')}
        centered
      >
        <Stack gap="md">
          <Text>{pendingDelete ? t('delete.confirmMessage', { code: pendingDelete.code }) : ''}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setPendingDelete(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" loading={deleteOperation.isPending} onClick={confirmDelete}>
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
