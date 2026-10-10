import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
} from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet, IconSearch, IconUpload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBomDocuments } from '../hooks/useBoms';
import { useDeleteBomDocument, useImportBom, useInspectBomImport } from '../hooks/useBomLines';
import { useAuth } from '../context/AuthContext';
import { ImportMappingModal } from '../components/domain/ImportMappingModal';
import { BomDocumentRow } from '../components/domain/BomDocumentRow';
import type {
  BomDocumentStatus,
  BomDocumentSummary,
  BomImportMapping,
  ImportInspectResult,
} from '../types/bom';

interface PendingImport {
  file: File;
  name: string;
  result: ImportInspectResult;
}

const STATUS_ORDER: BomDocumentStatus[] = ['Draft', 'InReview', 'Approved', 'Released'];

export function BomListPage() {
  const { t } = useTranslation(['bom', 'common', 'errors']);
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: documents, isLoading } = useBomDocuments();
  const inspectImport = useInspectBomImport();
  const importBom = useImportBom();
  const deleteBom = useDeleteBomDocument();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<BomDocumentStatus[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BomDocumentSummary | null>(null);

  const textFiltered = useMemo(() => {
    if (!documents) return [];
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(term) ||
        (doc.createdBy?.toLowerCase().includes(term) ?? false),
    );
  }, [documents, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<BomDocumentStatus, number> = {
      Draft: 0,
      InReview: 0,
      Approved: 0,
      Released: 0,
    };
    for (const doc of textFiltered) counts[doc.status] += 1;
    return counts;
  }, [textFiltered]);

  const filteredDocuments = useMemo(
    () =>
      statuses.length === 0
        ? textFiltered
        : textFiltered.filter((doc) => statuses.includes(doc.status)),
    [textFiltered, statuses],
  );

  const importError = (error: unknown, fallback: string): string => {
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    return typeof data === 'string' && data.length > 0 ? data : t(fallback);
  };

  const handleDrop = (files: FileWithPath[]) => {
    const file = files[0];
    if (!file) return;
    inspectImport.mutate(file, {
      onSuccess: (result) =>
        setPendingImport({ file, name: name || file.name.replace(/\.csv$/i, ''), result }),
      onError: (error) =>
        notifications.show({ color: 'nordRed', message: importError(error, 'import.inspectFailed') }),
    });
  };

  const handleConfirmImport = (mapping: BomImportMapping) => {
    if (!pendingImport) return;
    importBom.mutate(
      { file: pendingImport.file, name: pendingImport.name, mapping },
      {
        onSuccess: (summary) => {
          notifications.show({
            color: 'nordGreen',
            message: t('import.success', { count: summary.lineCount }),
          });
          setName('');
          setPendingImport(null);
          navigate(`/boms/${summary.id}`);
        },
        onError: (error) =>
          notifications.show({ color: 'nordRed', message: importError(error, 'import.failed') }),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteBom.mutate(pendingDelete.id, {
      onSuccess: () => {
        notifications.show({ color: 'nordGreen', message: t('list.deleted') });
        setPendingDelete(null);
      },
      onError: () => notifications.show({ color: 'nordRed', message: t('list.deleteFailed') }),
    });
  };

  const listBody = isLoading ? (
    <Text c="dimmed" px="md" py="sm">
      {t('loading', { ns: 'common' })}
    </Text>
  ) : !documents || documents.length === 0 ? (
    <Text c="dimmed" px="md" py="sm">
      {t('list.empty')}
    </Text>
  ) : filteredDocuments.length === 0 ? (
    <Text c="dimmed" px="md" py="sm">
      {t('search.noMatches')}
    </Text>
  ) : (
    <Stack gap={0}>
      {filteredDocuments.map((doc, index) => (
        <div key={doc.id}>
          {index > 0 && <Divider />}
          <BomDocumentRow
            document={doc}
            canEdit={canEdit}
            onOpen={(id) => navigate(`/boms/${id}`)}
            onDelete={setPendingDelete}
          />
        </div>
      ))}
    </Stack>
  );

  return (
    <Stack gap="lg" h="calc(100vh - 140px)">
      <Group justify="space-between">
        <Title order={2}>{t('list.title')}</Title>
      </Group>

      <Grid gap="lg" align="stretch" style={{ flex: 1, minHeight: 0 }}>
        <Grid.Col span={{ base: 12, md: 4 }} h="100%">
          <Stack gap="lg" h="100%">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Title order={4}>{t('search.title')}</Title>
                <TextInput
                  placeholder={t('search.placeholder')}
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {t('search.status')}
                    </Text>
                    {statuses.length > 0 && (
                      <Button variant="subtle" size="compact-xs" onClick={() => setStatuses([])}>
                        {t('search.clearFilters')}
                      </Button>
                    )}
                  </Group>
                  <Chip.Group multiple value={statuses} onChange={(value) => setStatuses(value as BomDocumentStatus[])}>
                    <Group gap="xs">
                      {STATUS_ORDER.map((status) => (
                        <Chip key={status} value={status} size="xs" color="nordBlue">
                          {`${t(`status.${status}`)} (${statusCounts[status]})`}
                        </Chip>
                      ))}
                    </Group>
                  </Chip.Group>
                </Stack>
                {documents && documents.length > 0 && (
                  <Text size="sm" c="dimmed">
                    {t('search.results', { count: filteredDocuments.length })}
                  </Text>
                )}
              </Stack>
            </Card>

            {canEdit && (
              <Card withBorder padding="lg">
                <Stack gap="md">
                  <Title order={4}>{t('import.title')}</Title>
                  <TextInput
                    label={t('import.name')}
                    placeholder={t('import.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                  <Dropzone
                    onDrop={handleDrop}
                    accept={['text/csv', 'application/vnd.ms-excel']}
                    loading={inspectImport.isPending}
                    maxFiles={1}
                  >
                    <Group justify="center" gap="md" mih={100} style={{ pointerEvents: 'none' }}>
                      <Dropzone.Accept>
                        <IconUpload style={{ width: rem(36), height: rem(36) }} />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <IconX style={{ width: rem(36), height: rem(36) }} />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <IconFileSpreadsheet style={{ width: rem(36), height: rem(36) }} />
                      </Dropzone.Idle>
                      <div>
                        <Text size="sm">{t('import.dropzone')}</Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {t('import.dropzoneHint')}
                        </Text>
                      </div>
                    </Group>
                  </Dropzone>
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }} h="100%">
          <Card withBorder padding={0} h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
            <Group justify="space-between" px="md" py="sm">
              <Title order={4}>{t('list.heading')}</Title>
              <Text size="sm" c="dimmed">
                {t('search.results', { count: filteredDocuments.length })}
              </Text>
            </Group>
            <Divider />
            <ScrollArea style={{ flex: 1 }} type="auto">
              {listBody}
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>

      <ImportMappingModal
        opened={!!pendingImport}
        fileName={pendingImport?.file.name ?? ''}
        result={pendingImport?.result ?? null}
        loading={importBom.isPending}
        onCancel={() => setPendingImport(null)}
        onConfirm={handleConfirmImport}
      />

      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('list.deleteTitle')}
        centered
      >
        <Stack gap="md">
          <Text>{pendingDelete ? t('list.deleteConfirm', { name: pendingDelete.name }) : ''}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setPendingDelete(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button color="nordRed" loading={deleteBom.isPending} onClick={handleConfirmDelete}>
              {t('actions.delete', { ns: 'common' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
