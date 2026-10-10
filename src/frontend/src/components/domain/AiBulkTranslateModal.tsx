import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { AiFieldType } from '../../types/ai';

/** One BOM line or route operation, flattened to the two translatable field pairs. */
export interface BulkTranslateRow {
  id: string;
  label: string;
  condition: string | null;
  formula: string | null;
  conditionPlm: string | null;
  formulaPlm: string | null;
}

export interface BulkTranslateSelection {
  lineId: string;
  fieldType: AiFieldType;
  naturalLanguage: string;
}

interface AiBulkTranslateModalProps {
  opened: boolean;
  rows: BulkTranslateRow[];
  starting: boolean;
  onClose: () => void;
  onStart: (items: BulkTranslateSelection[]) => void;
}

interface Candidate {
  key: string;
  id: string;
  label: string;
  fieldType: AiFieldType;
  source: string;
  current: string;
}

export function AiBulkTranslateModal({
  opened,
  rows,
  starting,
  onClose,
  onStart,
}: AiBulkTranslateModalProps) {
  const { t } = useTranslation(['ai', 'common']);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  // Everything matching the filter is selected by default, so only the exclusions are stored.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [wasOpen, setWasOpen] = useState(opened);

  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setOnlyEmpty(true);
      setExcluded(new Set());
    }
  }

  const candidates = useMemo<Candidate[]>(() => {
    const list: Candidate[] = [];
    for (const row of rows) {
      const pairs: [AiFieldType, string | null, string | null][] = [
        ['condition', row.condition, row.conditionPlm],
        ['formula', row.formula, row.formulaPlm],
      ];
      for (const [fieldType, source, current] of pairs) {
        if (!source?.trim()) continue;
        if (onlyEmpty && current?.trim()) continue;
        list.push({
          key: `${row.id}|${fieldType}`,
          id: row.id,
          label: row.label,
          fieldType,
          source: source.trim(),
          current: current?.trim() ?? '',
        });
      }
    }
    return list;
  }, [rows, onlyEmpty]);

  const selected = candidates.filter((c) => !excluded.has(c.key));

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setExcluded(checked ? new Set() : new Set(candidates.map((c) => c.key)));

  const handleStart = () => {
    if (selected.length === 0) {
      notifications.show({ color: 'nordAmber', message: t('bulk.noneSelected') });
      return;
    }
    onStart(
      selected.map((c) => ({
        lineId: c.id,
        fieldType: c.fieldType,
        naturalLanguage: c.source,
      })),
    );
  };

  const allSelected = candidates.length > 0 && selected.length === candidates.length;

  return (
    <Modal opened={opened} onClose={onClose} title={t('bulk.title')} size="90%">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('bulk.description')}
        </Text>

        <Group justify="space-between">
          <Switch
            label={t('bulk.onlyEmpty')}
            checked={onlyEmpty}
            onChange={(e) => setOnlyEmpty(e.currentTarget.checked)}
          />
          <Text size="sm">{t('bulk.selectedCount', { n: selected.length })}</Text>
        </Group>

        {candidates.length === 0 ? (
          <Alert color="nordAmber" icon={<IconAlertTriangle size={16} />}>
            {t('bulk.nothingToTranslate')}
          </Alert>
        ) : (
          <ScrollArea h={380} type="auto">
            <Table striped highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Checkbox
                      aria-label={t('bulk.selectAll')}
                      checked={allSelected}
                      indeterminate={!allSelected && selected.length > 0}
                      onChange={(e) => toggleAll(e.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th w={220}>{t('bulk.columns.row')}</Table.Th>
                  <Table.Th w={110}>{t('bulk.columns.field')}</Table.Th>
                  <Table.Th>{t('bulk.columns.source')}</Table.Th>
                  <Table.Th>{t('bulk.columns.current')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {candidates.map((candidate) => (
                  <Table.Tr key={candidate.key}>
                    <Table.Td>
                      <Checkbox
                        aria-label={candidate.key}
                        checked={!excluded.has(candidate.key)}
                        onChange={() => toggle(candidate.key)}
                      />
                    </Table.Td>
                    <Table.Td>{candidate.label}</Table.Td>
                    <Table.Td>
                      {candidate.fieldType === 'formula'
                        ? t('translate.formula')
                        : t('translate.condition')}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={3}>
                        {candidate.source}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {candidate.current}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            leftSection={<IconSparkles size={16} />}
            loading={starting}
            disabled={selected.length === 0}
            onClick={handleStart}
          >
            {t('bulk.start', { n: selected.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
