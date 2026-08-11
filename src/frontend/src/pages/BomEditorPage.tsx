import { useState } from 'react';
import {
  ActionIcon,
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
  IconPlus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { BomTreeGrid, type MoveDirection } from '../components/domain/BomTreeGrid';
import { MoveLineModal } from '../components/domain/MoveLineModal';
import { AddBomModal } from '../components/domain/AddBomModal';
import { HelpPanel } from '../components/domain/HelpPanel';
import { siblingsOf } from '../components/treeUtils';
import { useAuth } from '../context/AuthContext';
import { useBomAudit, useBomDocument } from '../hooks/useBoms';
import { useReleaseTemplates } from '../hooks/useReleaseTemplates';
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
import type { BomLine, UpdateBomLineRequest } from '../types/bom';

export function BomEditorPage() {
  const { t } = useTranslation(['bom', 'common']);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  const { data: document, isLoading } = useBomDocument(id);
  const { data: auditEntries } = useBomAudit(id);
  const { data: releaseTemplates } = useReleaseTemplates();
  const updateLine = useUpdateBomLine(id);
  const createLine = useCreateBomLine(id);
  const deleteLine = useDeleteBomLine(id);
  const restoreLine = useRestoreBomLine(id);
  const purgeLine = usePurgeBomLine(id);
  const moveLine = useMoveBomLine(id);
  const insertBom = useInsertBom(id);

  const [helpOpen, setHelpOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [movingLine, setMovingLine] = useState<BomLine | null>(null);
  const [addBomOpen, setAddBomOpen] = useState(false);

  const lines = document?.lines ?? [];

  const releaseTemplateOptions = (releaseTemplates ?? [])
    .filter((tpl) => tpl.isActive)
    .map((tpl) => tpl.name);

  const notifySaved = () =>
    notifications.show({ color: 'nordGreen', message: t('editor.saved') });
  const notifyFailed = () =>
    notifications.show({ color: 'nordRed', message: t('editor.saveFailed') });

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
      { lineId: movingLine.id, request: { parentId, sortOrder: nextSortOrder } },
      {
        onSuccess: () => notifications.show({ color: 'nordGreen', message: t('moveModal.moved') }),
        onError: () => notifications.show({ color: 'nordRed', message: t('moveModal.moveFailed') }),
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

  const handleMove = async (line: BomLine, direction: MoveDirection) => {
    const siblings = siblingsOf(lines, line);
    const index = siblings.findIndex((s) => s.id === line.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    const other = siblings[swapIndex];
    try {
      await moveLine.mutateAsync({
        lineId: line.id,
        request: { parentId: line.parentId, sortOrder: other.sortOrder },
      });
      await moveLine.mutateAsync({
        lineId: other.id,
        request: { parentId: other.parentId, sortOrder: line.sortOrder },
      });
    } catch {
      notifyFailed();
    }
  };

  const handleExport = async () => {
    const blob = await exportBomDocument(id);
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${document?.name ?? 'bom'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
        </Group>
        <Group gap="xs">
          {canEdit && (
            <Button
              variant="light"
              color="nordGreen"
              leftSection={<IconPlus size={16} />}
              onClick={() => handleAddChild(null)}
            >
              {t('editor.addRoot')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="light"
              color="nordFrost"
              leftSection={<IconDatabasePlus size={16} />}
              onClick={() => setAddBomOpen(true)}
            >
              {t('editor.addBom')}
            </Button>
          )}
          <Tooltip label={t('audit.title')}>
            <ActionIcon variant="light" size="lg" onClick={() => setAuditOpen(true)}>
              <IconHistory size={18} />
            </ActionIcon>
          </Tooltip>
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
          lines={lines}
          canEdit={canEdit}
          releaseTemplateOptions={releaseTemplateOptions}
          onUpdate={handleUpdate}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPurge={handlePurge}
          onMove={handleMove}
          onMoveToParent={setMovingLine}
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
