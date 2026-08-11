import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BomLine } from '../../types/bom';
import { useBomDocument, useBomDocuments } from '../../hooks/useBoms';
import { buildVisibleRows } from '../treeUtils';

const ROOT = '__ROOT__';

interface AddBomModalProps {
  opened: boolean;
  currentDocumentId: string;
  lines: BomLine[];
  onClose: () => void;
  onConfirm: (sourceDocumentId: string, parentId: string | null, lineIds: string[]) => void;
}

function nodeLabel(line: BomLine): string {
  const parts = [line.bsObjectId, line.description].filter(Boolean);
  return parts.length > 0 ? parts.join(' — ') : (line.position ?? '(no id)');
}

export function AddBomModal({
  opened,
  currentDocumentId,
  lines,
  onClose,
  onConfirm,
}: AddBomModalProps) {
  const { t } = useTranslation(['bom', 'common']);
  const { data: documents } = useBomDocuments();
  const [source, setSource] = useState<string | null>(null);
  const [parent, setParent] = useState<string>(ROOT);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: sourceDoc } = useBomDocument(source ?? '');

  const sourceOptions = useMemo(
    () =>
      (documents ?? [])
        .filter((d) => d.id !== currentDocumentId)
        .map((d) => ({ value: d.id, label: d.name })),
    [documents, currentDocumentId],
  );

  const parentOptions = useMemo(() => {
    const rows = buildVisibleRows(lines, new Set())
      .filter((r) => !r.line.isDeleted)
      .map((r) => ({
        value: r.line.id,
        label: `${'\u00A0\u00A0'.repeat(Math.max(r.depth - 1, 0))}${nodeLabel(r.line)}`,
      }));
    return [{ value: ROOT, label: t('addBom.topLevel') }, ...rows];
  }, [lines, t]);

  const sourceRows = useMemo(
    () => buildVisibleRows((sourceDoc?.lines ?? []).filter((l) => !l.isDeleted), new Set()),
    [sourceDoc],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const changeSource = (value: string | null) => {
    setSource(value);
    setSelected(new Set());
  };

  const confirm = () => {
    if (!source || selected.size === 0) return;
    onConfirm(source, parent === ROOT ? null : parent, [...selected]);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('addBom.title')} size="lg">
      <Stack gap="sm">
        {sourceOptions.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('addBom.noSources')}
          </Text>
        ) : (
          <>
            <Select
              label={t('addBom.source')}
              placeholder={t('addBom.sourcePlaceholder')}
              data={sourceOptions}
              value={source}
              onChange={changeSource}
              searchable
            />
            <Select
              label={t('addBom.parent')}
              data={parentOptions}
              value={parent}
              onChange={(v) => setParent(v ?? ROOT)}
              searchable
            />
            {source && (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  {t('addBom.nodes')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('addBom.nodesHint')}
                </Text>
                <ScrollArea.Autosize mah={320}>
                  <Stack gap={2}>
                    {sourceRows.length === 0 ? (
                      <Text c="dimmed" size="sm">
                        {t('addBom.noNodes')}
                      </Text>
                    ) : (
                      sourceRows.map((r) => (
                        <Checkbox
                          key={r.line.id}
                          size="xs"
                          checked={selected.has(r.line.id)}
                          onChange={() => toggle(r.line.id)}
                          label={nodeLabel(r.line)}
                          style={{ paddingLeft: (r.depth - 1) * 18 }}
                        />
                      ))
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            )}
          </>
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            color="nordGreen"
            onClick={confirm}
            disabled={!source || selected.size === 0}
          >
            {t('addBom.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
