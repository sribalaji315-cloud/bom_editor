import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconDownload,
  IconHelp,
  IconHistory,
  IconPlus,
  IconSparkles,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { RouteOperationsGrid, type MoveDirection } from '../components/domain/RouteOperationsGrid';
import { RouteHelpPanel } from '../components/domain/RouteHelpPanel';
import { AiTranslateModal } from '../components/domain/AiTranslateModal';
import {
  AiBulkTranslateModal,
  type BulkTranslateSelection,
} from '../components/domain/AiBulkTranslateModal';
import { AiJobDrawer } from '../components/domain/AiJobDrawer';
import {
  OperationRequestModal,
  type OperationRequestValues,
} from '../components/domain/OperationRequestModal';
import { useAuth } from '../context/AuthContext';
import { useRoute, useRouteAudit } from '../hooks/useRoutes';
import { useRequestOperation, useSelectableOperations } from '../hooks/useOperations';
import {
  useApplyTranslationJob,
  useCancelTranslationJob,
  useCreateTranslationJob,
  useLatestTranslationJob,
} from '../hooks/useAiJobs';
import {
  useCreateRouteOperation,
  useDeleteRouteOperation,
  useMoveRouteOperation,
  useUpdateRoute,
  useUpdateRouteOperation,
} from '../hooks/useRouteOperations';
import { exportRoute } from '../api/routes';
import type {
  RouteHeaderFields,
  RouteOperation,
  UpdateRouteOperationRequest,
} from '../types/route';
import type { AiFieldType } from '../types/ai';

const EMPTY_HEADER: RouteHeaderFields = {
  code: '',
  routeNumber: null,
  name: null,
  isActive: true,
};

function toUpdateRequest(
  operation: RouteOperation,
  overrides: Partial<UpdateRouteOperationRequest>,
): UpdateRouteOperationRequest {
  return {
    operationNo: operation.operationNo,
    operationId: operation.operationId,
    description: operation.description,
    descriptionLen: operation.descriptionLen,
    nextOperation: operation.nextOperation,
    swingWc: operation.swingWc,
    runtimeType: operation.runtimeType,
    setUpTime: operation.setUpTime,
    time: operation.time,
    resourceId: operation.resourceId,
    resourceGroup: operation.resourceGroup,
    routeGroupId: operation.routeGroupId,
    priority: operation.priority,
    condition: operation.condition,
    conditionPlm: operation.conditionPlm,
    formula: operation.formula,
    formulaPlm: operation.formulaPlm,
    ...overrides,
  };
}

export function RouteEditorPage() {
  const { t } = useTranslation(['route', 'common', 'operations', 'ai']);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  const { data: route, isLoading } = useRoute(id);
  const { data: auditEntries } = useRouteAudit(id);
  const { data: operationOptions } = useSelectableOperations();
  const requestOperation = useRequestOperation();
  const updateRoute = useUpdateRoute(id);
  const createOperation = useCreateRouteOperation(id);
  const updateOperation = useUpdateRouteOperation(id);
  const deleteOperation = useDeleteRouteOperation(id);
  const moveOperation = useMoveRouteOperation(id);

  const [helpOpen, setHelpOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [translateTarget, setTranslateTarget] = useState<{
    operation: RouteOperation;
    field: AiFieldType;
  } | null>(null);
  const [bulkTranslateOpen, setBulkTranslateOpen] = useState(false);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
  const lastJobStatus = useRef<string | null>(null);
  const translationJob = useLatestTranslationJob(id);
  const createTranslationJob = useCreateTranslationJob();
  const cancelTranslationJob = useCancelTranslationJob(id);
  const applyTranslationJob = useApplyTranslationJob(id);

  const [header, setHeader] = useState<RouteHeaderFields>(EMPTY_HEADER);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Render-time sync: load the header form once per route (setState in effects is disallowed here).
  if (route && route.id !== loadedId) {
    setLoadedId(route.id);
    setHeader({
      code: route.code,
      routeNumber: route.routeNumber,
      name: route.name,
      isActive: route.isActive,
    });
  }

  const operations = useMemo(() => route?.operations ?? [], [route]);

  const notifySaved = () =>
    notifications.show({ color: 'nordGreen', message: t('editor.saved') });
  const notifyFailed = (error?: unknown) => {
    const message =
      (error as { response?: { data?: string } })?.response?.data ?? t('editor.saveFailed');
    notifications.show({ color: 'nordRed', message });
  };

  const setField = <K extends keyof RouteHeaderFields>(key: K, value: RouteHeaderFields[K]) =>
    setHeader((prev) => ({ ...prev, [key]: value }));

  const handleSaveHeader = () => {
    updateRoute.mutate(header, { onSuccess: notifySaved, onError: notifyFailed });
  };

  const handleAddOperation = () => {
    createOperation.mutate({ description: '' }, { onSuccess: notifySaved, onError: notifyFailed });
  };

  const handleUpdateOperation = (operationId: string, request: UpdateRouteOperationRequest) => {
    updateOperation.mutate(
      { operationId, request },
      { onSuccess: notifySaved, onError: notifyFailed },
    );
  };

  const handleRequestOperation = (values: OperationRequestValues) => {
    requestOperation.mutate(values, {
      onSuccess: () => {
        notifications.show({
          color: 'nordGreen',
          message: t('request.success', { ns: 'operations' }),
        });
        setRequestOpen(false);
      },
      onError: (error) => notifyFailed(error),
    });
  };

  const applyTranslation = (expression: string) => {
    if (!translateTarget) return;
    const { operation, field } = translateTarget;
    const request = toUpdateRequest(
      operation,
      field === 'condition' ? { conditionPlm: expression } : { formulaPlm: expression },
    );
    handleUpdateOperation(operation.id, request);
  };

  const bulkTranslateRows = useMemo(
    () =>
      operations
        .filter((operation) => operation.condition?.trim() || operation.formula?.trim())
        .map((operation) => ({
          id: operation.id,
          label: operation.operationNo || operation.operationId || operation.description || operation.id,
          condition: operation.condition,
          formula: operation.formula,
          conditionPlm: operation.conditionPlm,
          formulaPlm: operation.formulaPlm,
        })),
    [operations],
  );

  const job = translationJob.data ?? null;
  const jobRunning = job?.status === 'Queued' || job?.status === 'Running';
  const operationLabels = useMemo(
    () =>
      new Map(
        operations.map((o) => [o.id, o.operationNo || o.operationId || o.description || o.id]),
      ),
    [operations],
  );

  // Announce a finished run once, without storing it in state.
  useEffect(() => {
    if (!job) return;
    const previous = lastJobStatus.current;
    lastJobStatus.current = job.status;
    if (previous === null || previous === job.status) return;
    if (job.status === 'Completed') {
      notifications.show({ color: 'nordGreen', message: t('job.completed', { ns: 'ai' }) });
    } else if (job.status === 'Failed') {
      notifications.show({ color: 'nordRed', message: t('job.failed', { ns: 'ai' }) });
    }
  }, [job, t]);

  const handleStartTranslationJob = (items: BulkTranslateSelection[]) => {
    createTranslationJob.mutate(
      { context: 'Route', targetId: id, items },
      {
        onSuccess: () => {
          setBulkTranslateOpen(false);
          setJobDrawerOpen(true);
          notifications.show({ color: 'nordGreen', message: t('bulk.started', { ns: 'ai' }) });
        },
        onError: (error) => notifyFailed(error),
      },
    );
  };

  const handleCancelTranslationJob = (jobId: string) => {
    cancelTranslationJob.mutate(jobId, {
      onSuccess: () => notifications.show({ color: 'nordAmber', message: t('job.cancelled', { ns: 'ai' }) }),
      onError: (error) => notifyFailed(error),
    });
  };

  const handleApplyTranslationJob = (jobId: string, itemIds: string[]) => {
    applyTranslationJob.mutate(
      { jobId, itemIds },
      {
        onSuccess: (result) =>
          notifications.show({
            color: 'nordGreen',
            message: t('job.applied', { ns: 'ai', n: result.applied }),
          }),
        onError: (error) => notifyFailed(error),
      },
    );
  };

  const handleDeleteOperation = (operation: RouteOperation) => {
    if (!window.confirm(t('editor.deleteConfirm'))) return;
    deleteOperation.mutate(operation.id, { onSuccess: notifySaved, onError: notifyFailed });
  };

  const handleMoveOperation = async (operation: RouteOperation, direction: MoveDirection) => {
    const index = operations.findIndex((o) => o.id === operation.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= operations.length) return;
    const other = operations[swapIndex];
    try {
      await moveOperation.mutateAsync({
        operationId: operation.id,
        request: { sortOrder: other.sortOrder },
      });
      await moveOperation.mutateAsync({
        operationId: other.id,
        request: { sortOrder: operation.sortOrder },
      });
    } catch (error) {
      notifyFailed(error);
    }
  };

  const handleExport = async () => {
    const blob = await exportRoute(id);
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${route?.code ?? 'route'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !route) {
    return <Text c="dimmed">{t('loading', { ns: 'common' })}</Text>;
  }

  return (
    <Stack gap="md" h="calc(100vh - 92px)">
      <Group justify="space-between">
        <Group gap="sm">
          <ActionIcon variant="subtle" onClick={() => navigate('/routes')} aria-label={t('editor.back')}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3}>{route.name ? `${route.code} — ${route.name}` : route.code}</Title>
        </Group>
        <Group gap="xs">
          {canEdit && (
            <Button
              variant="light"
              color="nordGreen"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddOperation}
            >
              {t('editor.addOperation')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="light"
              color="nordTeal"
              leftSection={<IconSparkles size={16} />}
              onClick={() => (job ? setJobDrawerOpen(true) : setBulkTranslateOpen(true))}
              rightSection={
                jobRunning ? (
                  <Badge size="sm" color="nordTeal">
                    {job?.status === 'Queued'
                      ? t('job.queued', { ns: 'ai' })
                      : `${(job?.completedItems ?? 0) + (job?.failedItems ?? 0)}/${job?.totalItems ?? 0}`}
                  </Badge>
                ) : undefined
              }
            >
              {job ? t('job.open', { ns: 'ai' }) : t('bulk.open', { ns: 'ai' })}
            </Button>
          )}
          {canEdit && job && (
            <Button
              variant="subtle"
              color="nordTeal"
              leftSection={<IconSparkles size={16} />}
              disabled={jobRunning}
              onClick={() => setBulkTranslateOpen(true)}
            >
              {t('bulk.open', { ns: 'ai' })}
            </Button>
          )}
          <Tooltip label={t('audit.title')}>
            <ActionIcon variant="light" size="lg" onClick={() => setAuditOpen(true)}>
              <IconHistory size={18} />
            </ActionIcon>
          </Tooltip>
          <Button variant="light" leftSection={<IconDownload size={16} />} onClick={handleExport}>
            {t('actions.export', { ns: 'common' })}
          </Button>
          <Tooltip label={t('actions.help', { ns: 'common' })}>
            <ActionIcon variant="light" size="lg" onClick={() => setHelpOpen(true)}>
              <IconHelp size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={5}>{t('editor.header')}</Title>
            {canEdit && (
              <Button size="xs" onClick={handleSaveHeader} loading={updateRoute.isPending}>
                {t('editor.save')}
              </Button>
            )}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            <TextInput
              label={t('header.code')}
              value={header.code}
              onChange={(e) => setField('code', e.currentTarget.value)}
              disabled={!canEdit}
              required
            />
            <TextInput
              label={t('header.routeNumber')}
              value={header.routeNumber ?? ''}
              onChange={(e) => setField('routeNumber', e.currentTarget.value || null)}
              disabled={!canEdit}
            />
            <TextInput
              label={t('header.name')}
              value={header.name ?? ''}
              onChange={(e) => setField('name', e.currentTarget.value || null)}
              disabled={!canEdit}
            />
            <Switch
              mt="lg"
              label={t('header.isActive')}
              checked={header.isActive}
              onChange={(e) => setField('isActive', e.currentTarget.checked)}
              disabled={!canEdit}
            />
          </SimpleGrid>
        </Stack>
      </Card>

      <div style={{ flex: 1, minHeight: 0 }}>
        {operations.length === 0 ? (
          <Text c="dimmed">{t('editor.noOperations')}</Text>
        ) : (
          <RouteOperationsGrid
            operations={operations}
            canEdit={canEdit}
            operationOptions={operationOptions ?? []}
            onUpdate={handleUpdateOperation}
            onDelete={handleDeleteOperation}
            onMove={handleMoveOperation}
            onRequestOperation={canEdit ? () => setRequestOpen(true) : undefined}
            onTranslate={
              canEdit ? (operation, field) => setTranslateTarget({ operation, field }) : undefined
            }
          />
        )}
      </div>

      <OperationRequestModal
        opened={requestOpen}
        loading={requestOperation.isPending}
        onClose={() => setRequestOpen(false)}
        onSubmit={handleRequestOperation}
      />

      <AiBulkTranslateModal
        opened={bulkTranslateOpen}
        rows={bulkTranslateRows}
        starting={createTranslationJob.isPending}
        onClose={() => setBulkTranslateOpen(false)}
        onStart={handleStartTranslationJob}
      />

      <AiJobDrawer
        opened={jobDrawerOpen}
        job={job}
        labels={operationLabels}
        canEdit={canEdit}
        cancelling={cancelTranslationJob.isPending}
        applying={applyTranslationJob.isPending}
        onClose={() => setJobDrawerOpen(false)}
        onCancel={handleCancelTranslationJob}
        onApply={handleApplyTranslationJob}
      />

      {translateTarget && (
        <AiTranslateModal
          opened
          context="Route"
          fieldType={translateTarget.field}
          initialText={
            (translateTarget.field === 'formula'
              ? translateTarget.operation.formula
              : translateTarget.operation.condition) ?? ''
          }
          onClose={() => setTranslateTarget(null)}
          onApply={applyTranslation}
        />
      )}

      <RouteHelpPanel opened={helpOpen} onClose={() => setHelpOpen(false)} canEdit={canEdit} />

      <Drawer
        opened={auditOpen}
        onClose={() => setAuditOpen(false)}
        position="right"
        size="lg"
        title={t('audit.title')}
      >
        {!auditEntries || auditEntries.length === 0 ? (
          <Text c="dimmed">{t('audit.empty')}</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('audit.when')}</Table.Th>
                <Table.Th>{t('audit.who')}</Table.Th>
                <Table.Th>{t('audit.change')}</Table.Th>
                <Table.Th>{t('audit.field')}</Table.Th>
                <Table.Th>{t('audit.from')}</Table.Th>
                <Table.Th>{t('audit.to')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {auditEntries.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>{new Date(entry.timestamp).toLocaleString()}</Table.Td>
                  <Table.Td>{entry.userName ?? ''}</Table.Td>
                  <Table.Td>{entry.changeType}</Table.Td>
                  <Table.Td>{entry.fieldName ?? ''}</Table.Td>
                  <Table.Td>{entry.oldValue ?? ''}</Table.Td>
                  <Table.Td>{entry.newValue ?? ''}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Drawer>
    </Stack>
  );
}
