import { useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Radio,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { BomLine } from '../../types/bom';
import { buildVisibleRows, descendantIdsOf } from '../treeUtils';

const ROOT = '__ROOT__';

interface MoveLineModalProps {
  opened: boolean;
  line: BomLine | null;
  lines: BomLine[];
  onClose: () => void;
  onConfirm: (parentId: string | null) => void;
}

function nodeLabel(line: BomLine): string {
  const parts = [line.bsObjectId, line.description].filter(Boolean);
  return parts.length > 0 ? parts.join(' — ') : (line.position ?? '(no id)');
}

export function MoveLineModal({ opened, line, lines, onClose, onConfirm }: MoveLineModalProps) {
  const { t } = useTranslation(['bom', 'common']);
  const [selected, setSelected] = useState<string>(ROOT);
  const [search, setSearch] = useState('');

  const excluded = useMemo(
    () => (line ? descendantIdsOf(lines, line.id) : new Set<string>()),
    [lines, line],
  );

  const targets = useMemo(() => {
    const rows = buildVisibleRows(lines, new Set());
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => !excluded.has(r.line.id) && !r.line.isDeleted)
      .filter(
        (r) =>
          term === '' ||
          (r.line.bsObjectId ?? '').toLowerCase().includes(term) ||
          (r.line.description ?? '').toLowerCase().includes(term),
      );
  }, [lines, excluded, search]);

  const confirm = () => onConfirm(selected === ROOT ? null : selected);

  return (
    <Modal opened={opened} onClose={onClose} title={t('moveModal.title')} size="lg">
      <Stack gap="sm">
        <TextInput
          placeholder={t('moveModal.search')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Radio.Group value={selected} onChange={setSelected}>
          <ScrollArea.Autosize mah={360}>
            <Stack gap={4}>
              <Radio value={ROOT} label={t('moveModal.topLevel')} />
              {targets.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t('moveModal.noTargets')}
                </Text>
              ) : (
                targets.map((r) => (
                  <Radio
                    key={r.line.id}
                    value={r.line.id}
                    label={nodeLabel(r.line)}
                    style={{ paddingLeft: (r.depth - 1) * 18 }}
                  />
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Radio.Group>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button color="nordBlue" onClick={confirm}>
            {t('moveModal.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
