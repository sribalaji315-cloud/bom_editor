import { useState } from 'react';
import {
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconDeviceFloppy, IconRestore } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { BomDocumentVersionSummary } from '../../types/bom';

interface VersionsDrawerProps {
  opened: boolean;
  versions: BomDocumentVersionSummary[] | undefined;
  loading: boolean;
  canCreate: boolean;
  canRestore: boolean;
  onClose: () => void;
  onCreate: (label: string | null) => void;
  onRestore: (version: BomDocumentVersionSummary) => void;
}

export function VersionsDrawer({
  opened,
  versions,
  loading,
  canCreate,
  canRestore,
  onClose,
  onCreate,
  onRestore,
}: VersionsDrawerProps) {
  const { t } = useTranslation(['bom']);
  const [label, setLabel] = useState('');

  const handleCreate = () => {
    onCreate(label.trim() || null);
    setLabel('');
  };

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="lg" title={t('versions.title')}>
      <Stack gap="lg">
        {canCreate && (
          <Group align="flex-end" gap="sm">
            <TextInput
              label={t('versions.label')}
              placeholder={t('versions.labelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleCreate}>
              {t('versions.create')}
            </Button>
          </Group>
        )}

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : !versions || versions.length === 0 ? (
          <Text c="dimmed">{t('versions.empty')}</Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('versions.number')}</Table.Th>
                <Table.Th>{t('versions.label')}</Table.Th>
                <Table.Th>{t('versions.created')}</Table.Th>
                <Table.Th>{t('versions.lines')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {versions.map((version) => (
                <Table.Tr key={version.id}>
                  <Table.Td>
                    <Badge variant="light" color="nordFrost">
                      {t('versions.numbered', { number: version.versionNumber })}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{version.label ?? '\u2014'}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(version.createdAt).toLocaleString()}</Text>
                    <Text size="xs" c="dimmed">
                      {version.createdBy ?? ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>{version.lineCount}</Table.Td>
                  <Table.Td>
                    {canRestore && (
                      <Button
                        size="compact-sm"
                        variant="subtle"
                        leftSection={<IconRestore size={14} />}
                        onClick={() => onRestore(version)}
                      >
                        {t('versions.restore')}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Drawer>
  );
}
