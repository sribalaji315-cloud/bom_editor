import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { BomImportMapping, ImportInspectResult } from '../../types/bom';

interface ImportMappingModalProps {
  opened: boolean;
  fileName: string;
  result: ImportInspectResult | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (mapping: BomImportMapping) => void;
}

const UNMAPPED = '';

function buildInitialAssignments(result: ImportInspectResult): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const field of result.fields) {
    const suggested = result.suggestedMapping[field.key];
    initial[field.key] = suggested === undefined ? UNMAPPED : String(suggested);
  }
  return initial;
}

export function ImportMappingModal({
  opened,
  fileName,
  result,
  loading,
  onCancel,
  onConfirm,
}: ImportMappingModalProps) {
  const { t } = useTranslation(['bom', 'common']);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<ImportInspectResult | null>(null);

  // Reset the dropdowns whenever a new inspection result arrives (render-time state adjustment).
  if (result !== lastResult) {
    setLastResult(result);
    setAssignments(result ? buildInitialAssignments(result) : {});
  }

  const columnOptions = useMemo(
    () =>
      (result?.columns ?? []).map((column) => ({
        value: String(column.index),
        label: column.header,
      })),
    [result],
  );

  const missingRequired = useMemo(
    () =>
      (result?.fields ?? [])
        .filter((field) => field.required && !assignments[field.key])
        .map((field) => t(`import.fields.${field.key}`)),
    [result, assignments, t],
  );

  const handleConfirm = () => {
    if (!result || missingRequired.length > 0) return;
    const mapping: BomImportMapping = {};
    for (const [key, value] of Object.entries(assignments)) {
      if (value !== UNMAPPED) mapping[key] = Number(value);
    }
    onConfirm(mapping);
  };

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t('import.mapping.title')}
      size="xl"
      centered
    >
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          {t('import.mapping.intro', { file: fileName })}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {(result?.fields ?? []).map((field) => (
            <Select
              key={field.key}
              label={t(`import.fields.${field.key}`)}
              placeholder={t('import.mapping.unmapped')}
              data={columnOptions}
              value={assignments[field.key] ?? UNMAPPED}
              onChange={(value) =>
                setAssignments((prev) => ({ ...prev, [field.key]: value ?? UNMAPPED }))
              }
              clearable={!field.required}
              required={field.required}
              searchable
              comboboxProps={{ withinPortal: true }}
            />
          ))}
        </SimpleGrid>

        {result && result.sampleRows.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('import.mapping.preview')}
            </Text>
            <ScrollArea.Autosize mah={200} type="auto">
              <Table striped withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    {result.columns.map((column) => (
                      <Table.Th key={column.index} style={{ whiteSpace: 'nowrap' }}>
                        {column.header}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.sampleRows.map((row, rowIndex) => (
                    <Table.Tr key={rowIndex}>
                      {result.columns.map((column) => (
                        <Table.Td key={column.index} style={{ whiteSpace: 'nowrap' }}>
                          {row[column.index] ?? ''}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Stack>
        )}

        {missingRequired.length > 0 && (
          <Alert color="nordAmber" icon={<IconAlertTriangle size={16} />}>
            <Group gap="xs">
              <Text size="sm">{t('import.mapping.missingRequired')}</Text>
              {missingRequired.map((label) => (
                <Badge key={label} color="nordAmber" variant="light">
                  {label}
                </Badge>
              ))}
            </Group>
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            color="nordBlue"
            loading={loading}
            disabled={missingRequired.length > 0}
            onClick={handleConfirm}
          >
            {t('import.mapping.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
