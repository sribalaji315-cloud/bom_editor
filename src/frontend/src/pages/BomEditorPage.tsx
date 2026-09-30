import { useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconDatabasePlus,
  IconDownload,
  IconHelp,
  IconHistory,
  IconListCheck,
  IconPlus,
  IconVersions,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { BomTreeGrid, type BomTreeGridHandle, type MoveDirection } from '../components/domain/BomTreeGrid';
import { MoveLineModal } from '../components/domain/MoveLineModal';
import { AddBomModal } from '../components/domain/AddBomModal';
import { AiTranslateModal } from '../components/domain/AiTranslateModal';
import { ValidationPanel } from '../components/domain/ValidationPanel';
import { BomStatusBadge } from '../components/domain/BomStatusBadge';
import { VersionsDrawer } from '../components/domain/VersionsDrawer';
import { HelpPanel } from '../components/domain/HelpPanel';
import { siblingsOf } from '../components/treeUtils';
import { useAuth } from '../context/AuthContext';
import { useBomAudit, useBomDocument } from '../hooks/useBoms';
import {
  useBomVersions,
  useChangeBomStatus,
  useCreateBomVersion,
  useRestoreBomVersion,
} from '../hooks/useBomVersions';
import { useReleaseTemplates } from '../hooks/useReleaseTemplates';
import { useValidateBom } from '../hooks/useValidation';
import {
  useCreateBomLine,
  useDeleteBomLine,
  useInsertBom,
  useMoveBomLine,
  usePurgeBomLine,
  useRestoreBomLine,
  useUpdateBomLine,
} from '../hooks/useBomLines';
import { exportBomDocument } from '../api/boms';
import type { BomDocumentStatus, BomLine, UpdateBomLineRequest } from '../types/bom';
import type { ValidationReport } from '../types/validation';
import type { AiFieldType } from '../types/ai';

/** The export request uses responseType blob, so a 409 body arrives as a Blob rather than JSON. */
async function readBlockedReport(error: unknown): Promise<ValidationReport | null> {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  if (response?.status !== 409) return null;
  if (response.data instanceof Blob) {
    try {
      return JSON.parse(await response.data.text()) as ValidationReport;
    } catch {
      return null;
    }
  }
  return (response.data as ValidationReport) ?? null;
}

function conflictMessage(error: unknown): string | null {
  const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response;
  return response?.status === 409 ? (response.data?.error ?? null) : null;
}

export function BomEditorPage() {
  const { t } = useTranslation(['bom', 'common', 'validation']);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { canEdit, hasRole } = useAuth();

  const { data: document, isLoading } = useBomDocument(id);
  const { data: auditEntries } = useBomAudit(id);
  const { data: releaseTemplates } = useReleaseTemplates();
  const { data: versions, isLoading: versionsLoading } = useBomVersions(id);
  const updateLine = useUpdateBomLine(id);
  const createLine = useCreateBomLine(id);
  const deleteLine = useDeleteBomLine(id);
  const restoreLine = useRestoreBomLine(id);
  const purgeLine = usePurgeBomLine(id);
  const moveLine = useMoveBomLine(id);
  const insertBom = useInsertBom(id);
  const validateBom = useValidateBom(id);
  const changeStatus = useChangeBomStatus(id);
  const createVersion = useCreateBomVersion(id);
  const restoreVersion = useRestoreBomVersion(id);

  const [helpOpen, setHelpOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [movingLine, setMovingLine] = useState<BomLine | null>(null);
  const [addBomOpen, setAddBomOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const gridRef = useRef<BomTreeGridHandle>(null);
  const [translateTarget, setTranslateTarget] = useState<{ line: BomLine; field: AiFieldType } | null>(
    null,
  );

  const lines = document?.lines ?? [];
  const status = document?.status ?? 'Draft';
  // Only drafts are editable; everything else is frozen for review.
  const canEditNow = canEdit && status === 'Draft';
  const canApprove = hasRole('DataSpecialist', 'Admin');
  const canRelease = hasRole('Admin');

  const releaseTemplateOptions = (releaseTemplates ?? [])
    .filter((tpl) => tpl.isActive)
    .map((tpl) => tpl.name);

  const invalidLineIds = useMemo(
    () =>
      new Set(
        (report?.issues ?? [])
          .filter((issue) => issue.severity === 'Error' && issue.lineId)
          .map((issue) => issue.lineId as string),
      ),
    [report],
  );

  const notifySaved = () =>
    notifications.show({ color: 'nordGreen', message: t('editor.saved') });
  const notifyFailed = (error?: unknown) => {
    const conflict = conflictMessage(error);
    notifications.show({
      color: 'nordRed',
      message: conflict ?? t('editor.saveFailed'),
    });
  };

  const handleChangeStatus = (next: BomDocumentStatus) => {
    changeStatus.mutate(
      { status: next, comment: null },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('status.changed') }),
        onError: (error) =>
          notifications.show({
            color: 'nordRed',
            message: conflictMessage(error) ?? t('status.changeFailed'),
          }),
      },
    );
  };

  const handleCreateVersion = (label: string | null) => {
    createVersion.mutate(
      { label },
      {
        onSuccess: () =>
          notifications.show({ color: 'nordGreen', message: t('versions.snapshotTaken') }),
        onError: (error) =>
          notifications.show({
            color: 'nordRed',
            message: conflictMessage(error) ?? t('versions.snapshotFailed'),
          }),
      },
    );
  };

  const handleRestoreVersion = (versionId: string, versionNumber: number) => {
    if (!window.confirm(t('versions.restoreConfirm', { number: versionNumber }))) return;
    restoreVersion.mutate(versionId, {
      onSuccess: () => notifications.show({ color: 'nordGreen', message: t('versions.restored') }),
      onError: (error) =>
        notifications.show({
          color: 'nordRed',
          message: conflictMessage(error) ?? t('versions.restoreFailed'),
        }),
    });
  };

  const handleUpdate = (lineId: string, request: UpdateBomLineRequest) => {
    updateLine.mutate({ lineId, request }, { onSuccess: notifySaved, onError: notifyFailed });
  };

  const handleAddChild = (parent: BomLine | null) => {
    createLine.mutate(
      { parentId: parent?.id ?? null, action: 'Add', description: '' },
      { onSuccess: notifySaved, onError: notifyFailed },
    );
  };

  const handleDelete = (line: BomLine) => {
    if (!window.confirm(t('editor.deleteConfirm'))) return;
    deleteLine.mutate(line.id, { onSuccess: notifySaved, onError: notifyFailed });
  };

  const handleRestore = (line: BomLine) => {
    if (line.isDeleted) {
      restoreLine.mutate(line.id, {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('editor.restored') }),
        onError: notifyFailed,
      });
      return;
    }
    // Action=Delete row: revert the staged PLM action back to Keep.
    const request: UpdateBomLineRequest = { ...line, action: 'Keep' };
    updateLine.mutate(
      { lineId: line.id, request },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('editor.restored') }),
        onError: notifyFailed,
      },
    );
  };

  const handlePurge = (line: BomLine) => {
    if (!window.confirm(t('editor.removeConfirm'))) return;
    purgeLine.mutate(line.id, {
      onSuccess: () =>
        notifications.show({ color: 'nordGreen', message: t('editor.removed') }),
      onError: notifyFailed,
    });
  };

  const handleMoveToParent = (parentId: string | null) => {
    if (!movingLine) return;
    const nextSortOrder =
      lines
        .filter((l) => l.parentId === parentId)
        .reduce((max, l) => Math.max(max, l.sortOrder), -1) + 1;
    moveLine.mutate(
      {
        lineId: movingLine.id,
        request: {
          parentId,
          sortOrder: nextSortOrder,
          concurrencyStamp: movingLine.concurrencyStamp,
        },
      },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('moveModal.moved') }),
        onError: (error) =>
          notifications.show({
            color: 'nordRed',
            message: conflictMessage(error) ?? t('moveModal.moveFailed'),
          }),
      },
    );
    setMovingLine(null);
  };

  const handleInsertBom = (sourceDocumentId: string, parentId: string | null, lineIds: string[]) => {
    insertBom.mutate(
      { sourceDocumentId, parentId, lineIds },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('addBom.inserted') }),
        onError: () => notifications.show({ color: 'nordRed', message: t('addBom.insertFailed') }),
      },
    );
    setAddBomOpen(false);
  };

  const applyTranslation = (expression: string) => {
    if (!translateTarget) return;
    const { line, field } = translateTarget;
    const request: UpdateBomLineRequest = {
      ...line,
      conditionsPlm: field === 'condition' ? expression : line.conditionsPlm,
      formulaPlm: field === 'formula' ? expression : line.formulaPlm,
    };
    handleUpdate(line.id, request);
  };

  const handleMove = async (line: BomLine, direction: MoveDirection) => {
    const siblings = siblingsOf(lines, line);
    const index = siblings.findIndex((s) => s.id === line.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    const other = siblings[swapIndex];
    try {
      await moveLine.mutateAsync({
        lineId: line.id,
        request: {
          parentId: line.parentId,
          sortOrder: other.sortOrder,
          concurrencyStamp: line.concurrencyStamp,
        },
      });
      await moveLine.mutateAsync({
        lineId: other.id,
        request: {
          parentId: other.parentId,
          sortOrder: line.sortOrder,
          concurrencyStamp: other.concurrencyStamp,
        },
      });
    } catch (error) {
      notifyFailed(error);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportBomDocument(id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document?.name ?? 'bom'}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const blocked = await readBlockedReport(error);
      if (!blocked) {
        notifyFailed();
        return;
      }
      setReport(blocked);
      setValidationOpen(true);
      notifications.show({ color: 'nordRed', message: t('editor.exportBlocked', { ns: 'validation' }) });
    }
  };

  const handleValidate = () => {
    validateBom.mutate(undefined, {
      onSuccess: (result) => {
        setReport(result);
        setValidationOpen(true);
        if (result.errorCount === 0) {
          notifications.show({
            color: 'nordGreen',
            message: t('editor.clean', { ns: 'validation' }),
          });
        }
      },
      onError: () =>
        notifications.show({ color: 'nordRed', message: t('editor.failed', { ns: 'validation' }) }),
    });
  };

  if (isLoading || !document) {
    return <Text c="dimmed">{t('loading', { ns: 'common' })}</Text>;
  }

  return (
    <Stack gap="md" h="calc(100vh - 92px)">
      <Group justify="space-between">
        <Group gap="sm">
          <ActionIcon variant="subtle" onClick={() => navigate('/')} aria-label={t('editor.back')}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3}>{document.name}</Title>
          <BomStatusBadge status={status} size="lg" />
        </Group>
        <Group gap="xs">
          {status === 'Draft' && canEdit && (
            <Button
              variant="light"
              color="nordAmber"
              loading={changeStatus.isPending}
              onClick={() => handleChangeStatus('InReview')}
            >
              {t('status.submit')}
            </Button>
          )}
          {status === 'InReview' && canApprove && (
            <>
              <Button
                variant="light"
                color="nordGreen"
                loading={changeStatus.isPending}
                onClick={() => handleChangeStatus('Approved')}
              >
                {t('status.approve')}
              </Button>
              <Button
                variant="subtle"
                color="nordRed"
                loading={changeStatus.isPending}
                onClick={() => handleChangeStatus('Draft')}
              >
                {t('status.reject')}
              </Button>
            </>
          )}
          {status === 'Approved' && canRelease && (
            <Button
              variant="light"
              color="nordBlue"
              loading={changeStatus.isPending}
              onClick={() => handleChangeStatus('Released')}
            >
              {t('status.release')}
            </Button>
          )}
          {status === 'Approved' && canApprove && (
            <Button
              variant="subtle"
              color="gray"
              loading={changeStatus.isPending}
              onClick={() => handleChangeStatus('Draft')}
            >
              {t('status.reopen')}
            </Button>
          )}
          {canEditNow && (
            <Button
              variant="light"
              color="nordGreen"
              leftSection={<IconPlus size={16} />}
              onClick={() => handleAddChild(null)}
            >
              {t('editor.addRoot')}
            </Button>
          )}
          {canEditNow && (
            <Button
              variant="light"
              color="nordFrost"
              leftSection={<IconDatabasePlus size={16} />}
              onClick={() => setAddBomOpen(true)}
            >
              {t('editor.addBom')}
            </Button>
          )}
          <Tooltip label={t('versions.open')}>
            <ActionIcon variant="light" size="lg" onClick={() => setVersionsOpen(true)}>
              <IconVersions size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('audit.title')}>
            <ActionIcon variant="light" size="lg" onClick={() => setAuditOpen(true)}>
              <IconHistory size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            variant="light"
            color={report && report.errorCount > 0 ? 'nordRed' : 'nordTeal'}
            leftSection={<IconListCheck size={16} />}
            loading={validateBom.isPending}
            onClick={handleValidate}
            rightSection={
              report && report.errorCount > 0 ? (
                <Badge size="sm" circle color="nordRed">
                  {report.errorCount}
                </Badge>
              ) : undefined
            }
          >
            {t('editor.validate', { ns: 'validation' })}
          </Button>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
          >
            {t('actions.export', { ns: 'common' })}
          </Button>
          <Tooltip label={t('actions.help', { ns: 'common' })}>
            <ActionIcon variant="light" size="lg" onClick={() => setHelpOpen(true)}>
              <IconHelp size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div style={{ flex: 1, minHeight: 0 }}>
        <BomTreeGrid
          ref={gridRef}
          lines={lines}
          canEdit={canEditNow}
          releaseTemplateOptions={releaseTemplateOptions}
          invalidLineIds={invalidLineIds}
          onUpdate={handleUpdate}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPurge={handlePurge}
          onMove={handleMove}
          onMoveToParent={setMovingLine}
          onTranslate={
            canEditNow ? (line, field) => setTranslateTarget({ line, field }) : undefined
          }
        />
      </div>

      <MoveLineModal
        opened={movingLine !== null}
        line={movingLine}
        lines={lines}
        onClose={() => setMovingLine(null)}
        onConfirm={handleMoveToParent}
      />

      <AddBomModal
        opened={addBomOpen}
        currentDocumentId={id}
        lines={lines}
        onClose={() => setAddBomOpen(false)}
        onConfirm={handleInsertBom}
      />

      <HelpPanel opened={helpOpen} onClose={() => setHelpOpen(false)} canEdit={canEdit} />

      <ValidationPanel
        opened={validationOpen}
        report={report}
        loading={validateBom.isPending}
        onClose={() => setValidationOpen(false)}
        onSelectIssue={(lineId) => gridRef.current?.focusLine(lineId)}
      />

      <VersionsDrawer
        opened={versionsOpen}
        versions={versions}
        loading={versionsLoading}
        canCreate={canEdit}
        canRestore={hasRole('Admin') && status === 'Draft'}
        onClose={() => setVersionsOpen(false)}
        onCreate={handleCreateVersion}
        onRestore={(version) => handleRestoreVersion(version.id, version.versionNumber)}
      />

      {translateTarget && (
        <AiTranslateModal
          opened
          context="Bom"
          fieldType={translateTarget.field}
          initialText={
            (translateTarget.field === 'formula'
              ? translateTarget.line.formula
              : translateTarget.line.conditions) ?? ''
          }
          onClose={() => setTranslateTarget(null)}
          onApply={applyTranslation}
        />
      )}

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
