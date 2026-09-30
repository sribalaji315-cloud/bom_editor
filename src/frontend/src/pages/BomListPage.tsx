import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
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
import {
  IconFileSpreadsheet,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBomDocuments } from '../hooks/useBoms';
import { useDeleteBomDocument, useImportBom, useInspectBomImport } from '../hooks/useBomLines';
import { useAuth } from '../context/AuthContext';
import { ImportMappingModal } from '../components/domain/ImportMappingModal';
import { BomStatusBadge } from '../components/domain/BomStatusBadge';
import type { BomDocumentSummary, BomImportMapping, ImportInspectResult } from '../types/bom';

interface PendingImport {
  file: File;
  name: string;
  result: ImportInspectResult;
}

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
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BomDocumentSummary | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(term) ||
        (doc.createdBy?.toLowerCase().includes(term) ?? false),
    );
  }, [documents, search]);

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

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('list.title')}</Title>
      </Group>

      <Grid gap="lg" align="stretch">
        <Grid.Col span={{ base: 12, md: canEdit ? 4 : 12 }}>
          <Card withBorder padding="lg" h="100%">
            <Stack gap="md">
              <Title order={4}>{t('search.title')}</Title>
              <TextInput
                placeholder={t('search.placeholder')}
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              {documents && documents.length > 0 && (
                <Text size="sm" c="dimmed">
                  {t('search.results', { count: filteredDocuments.length })}
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {canEdit && (
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card withBorder padding="lg" h="100%">
              <Stack gap="md">
                <Title order={4}>{t('import.title')}</Title>
                <TextInput
                  label={t('import.name')}
                  placeholder={t('import.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  maw={400}
                />
                <Dropzone
                  onDrop={handleDrop}
                  accept={['text/csv', 'application/vnd.ms-excel']}
                  loading={inspectImport.isPending}
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
          </Grid.Col>
        )}
      </Grid>

      {isLoading ? (
        <Text c="dimmed">{t('loading', { ns: 'common' })}</Text>
      ) : !documents || documents.length === 0 ? (
        <Text c="dimmed">{t('list.empty')}</Text>
      ) : filteredDocuments.length === 0 ? (
        <Text c="dimmed">{t('search.noMatches')}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              withBorder
              padding="lg"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/boms/${doc.id}`)}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600}>{doc.name}</Text>
                  <Group gap="xs" wrap="nowrap">
                    <BomStatusBadge status={doc.status} />
                    <Badge color="nordFrost" variant="light">
                      {t('list.lineCount', { count: doc.lineCount })}
                    </Badge>
                    {canEdit && (
                      <ActionIcon
                        variant="subtle"
                        color="nordRed"
                        aria-label={t('list.delete')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(doc);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
                {doc.createdBy && (
                  <Text size="sm" c="dimmed">
                    {t('list.createdBy', { name: doc.createdBy })}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  {t('list.updated', { when: new Date(doc.updatedAt).toLocaleString() })}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

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
