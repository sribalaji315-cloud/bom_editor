import { useState } from 'react';
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
} from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet, IconUpload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBomDocuments } from '../hooks/useBoms';
import { useImportBom, useInspectBomImport } from '../hooks/useBomLines';
import { useAuth } from '../context/AuthContext';
import { ImportMappingModal } from '../components/domain/ImportMappingModal';
import type { BomImportMapping, ImportInspectResult } from '../types/bom';

export function BomListPage() {
  const { t } = useTranslation(['bom', 'common', 'errors']);
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: documents, isLoading } = useBomDocuments();
  const inspectBom = useInspectBomImport();
  const importBom = useImportBom();
  const [name, setName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [inspectResult, setInspectResult] = useState<ImportInspectResult | null>(null);
  const [mappingOpened, setMappingOpened] = useState(false);

  const handleDrop = (files: FileWithPath[]) => {
    const file = files[0];
    if (!file) return;
    setPendingFile(file);
    inspectBom.mutate(file, {
      onSuccess: (result) => {
        setInspectResult(result);
        setMappingOpened(true);
      },
      onError: () => {
        setPendingFile(null);
        notifications.show({ color: 'nordRed', message: t('import.inspectFailed') });
      },
    });
  };

  const handleConfirmImport = (mapping: BomImportMapping) => {
    if (!pendingFile) return;
    importBom.mutate(
      { file: pendingFile, name: name || pendingFile.name.replace(/\.csv$/i, ''), mapping },
      {
        onSuccess: (summary) => {
          notifications.show({
            color: 'nordGreen',
            message: t('import.success', { count: summary.lineCount }),
          });
          setName('');
          setPendingFile(null);
          setInspectResult(null);
          setMappingOpened(false);
          navigate(`/boms/${summary.id}`);
        },
        onError: () =>
          notifications.show({ color: 'nordRed', message: t('import.failed') }),
      },
    );
  };

  const handleCancelMapping = () => {
    setMappingOpened(false);
    setInspectResult(null);
    setPendingFile(null);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('list.title')}</Title>
      </Group>

      {canEdit && (
        <Card withBorder padding="lg">
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
              loading={inspectBom.isPending || importBom.isPending}
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

      <ImportMappingModal
        opened={mappingOpened}
        fileName={pendingFile?.name ?? ''}
        result={inspectResult}
        loading={importBom.isPending}
        onCancel={handleCancelMapping}
        onConfirm={handleConfirmImport}
      />

      {isLoading ? (
        <Text c="dimmed">{t('loading', { ns: 'common' })}</Text>
      ) : !documents || documents.length === 0 ? (
        <Text c="dimmed">{t('list.empty')}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {documents.map((doc) => (
            <Card
              key={doc.id}
              withBorder
              padding="lg"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/boms/${doc.id}`)}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={600}>{doc.name}</Text>
                  <Badge color="nordFrost" variant="light">
                    {t('list.lineCount', { count: doc.lineCount })}
                  </Badge>
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
    </Stack>
  );
}
