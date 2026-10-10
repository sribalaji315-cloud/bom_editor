import { ActionIcon, Badge, Box, Group, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { BomStatusBadge } from './BomStatusBadge';
import type { BomDocumentSummary } from '../../types/bom';

interface BomDocumentRowProps {
  document: BomDocumentSummary;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onDelete: (document: BomDocumentSummary) => void;
}

export function BomDocumentRow({ document, canEdit, onOpen, onDelete }: BomDocumentRowProps) {
  const { t } = useTranslation(['bom']);
  const updated = t('list.updated', { when: new Date(document.updatedAt).toLocaleString() });

  return (
    // Not a <button>: it contains the delete button, and nested buttons are invalid HTML.
    <Box
      role="button"
      tabIndex={0}
      px="md"
      py="sm"
      style={{ cursor: 'pointer' }}
      onClick={() => onOpen(document.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(document.id);
        }
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {document.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {document.createdBy
              ? `${t('list.createdBy', { name: document.createdBy })} · ${updated}`
              : updated}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <BomStatusBadge status={document.status} />
          <Badge color="nordFrost" variant="light">
            {t('list.lineCount', { count: document.lineCount })}
          </Badge>
          {canEdit && (
            <ActionIcon
              variant="subtle"
              color="nordRed"
              aria-label={t('list.delete')}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(document);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Box>
  );
}
