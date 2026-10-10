import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  Drawer,
  Group,
  Progress,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconPlayerStop } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { AiJobStatus, AiTranslationJob } from '../../types/aiJob';

interface AiJobDrawerProps {
  opened: boolean;
  job: AiTranslationJob | null;
  /** Row id -> display label, so the drawer never has to fetch the document itself. */
  labels: Map<string, string>;
  canEdit: boolean;
  cancelling: boolean;
  applying: boolean;
  onClose: () => void;
  onCancel: (jobId: string) => void;
  onApply: (jobId: string, itemIds: string[]) => void;
}

const STATUS_COLORS: Record<AiJobStatus, string> = {
  Queued: 'gray',
  Running: 'nordBlue',
  Completed: 'nordGreen',
  Failed: 'nordRed',
  Cancelled: 'nordAmber',
};

export function AiJobDrawer({
  opened,
  job,
  labels,
  canEdit,
  cancelling,
  applying,
  onClose,
  onCancel,
  onApply,
}: AiJobDrawerProps) {
  const { t } = useTranslation(['ai', 'common']);
  // Suggestions are opt-out: everything translated is applied unless the user unticks it.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const applicable = useMemo(
    () => (job?.items ?? []).filter((item) => item.expression && !item.appliedAt),
    [job],
  );
  const selectedIds = applicable.filter((item) => !excluded.has(item.id)).map((item) => item.id);

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const inProgress = job?.status === 'Queued' || job?.status === 'Running';
  const done = job ? job.completedItems + job.failedItems : 0;

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="xl" title={t('job.title')}>
      {!job ? (
        <Text c="dimmed">{t('job.none')}</Text>
      ) : (
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="xs">
              <Badge color={STATUS_COLORS[job.status]}>{t(`job.status.${job.status}`)}</Badge>
              {job.model && (
                <Text size="xs" c="dimmed">
                  {job.model}
                </Text>
              )}
            </Group>
            {inProgress && canEdit && (
              <Button
                size="xs"
                variant="light"
                color="nordRed"
                leftSection={<IconPlayerStop size={14} />}
                loading={cancelling}
                onClick={() => onCancel(job.id)}
              >
                {t('job.cancel')}
              </Button>
            )}
          </Group>

          {job.status === 'Queued' ? (
            <Text size="sm">
              {job.queuePosition > 0
                ? t('job.queuedAhead', { n: job.queuePosition })
                : t('job.startingShortly')}
            </Text>
          ) : (
            <Stack gap={4}>
              <Text size="sm">
                {t('job.progress', { done, total: job.totalItems, failed: job.failedItems })}
              </Text>
              <Progress
                value={job.totalItems === 0 ? 0 : (done / job.totalItems) * 100}
                animated={job.status === 'Running'}
              />
            </Stack>
          )}

          {job.error && (
            <Alert color="nordRed" icon={<IconAlertTriangle size={16} />}>
              {job.error}
            </Alert>
          )}

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40} />
                <Table.Th w={200}>{t('bulk.columns.row')}</Table.Th>
                <Table.Th w={100}>{t('bulk.columns.field')}</Table.Th>
                <Table.Th>{t('bulk.columns.source')}</Table.Th>
                <Table.Th>{t('bulk.columns.result')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {job.items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    {item.expression && !item.appliedAt && (
                      <Checkbox
                        aria-label={item.id}
                        checked={!excluded.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    )}
                  </Table.Td>
                  <Table.Td>{labels.get(item.lineId) ?? item.lineId}</Table.Td>
                  <Table.Td>
                    {item.fieldType === 'formula' ? t('translate.formula') : t('translate.condition')}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={3}>
                      {item.sourceText}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {item.expression ? (
                      <Stack gap={2}>
                        <Code block>{item.expression}</Code>
                        {item.appliedAt && (
                          <Text size="xs" c="nordGreen">
                            {t('job.itemApplied')}
                          </Text>
                        )}
                      </Stack>
                    ) : item.error ? (
                      <Text size="sm" c="nordRed" lineClamp={3}>
                        {item.error}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t('job.pending')}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="flex-end">
            <Button
              disabled={!canEdit || selectedIds.length === 0}
              loading={applying}
              onClick={() => onApply(job.id, selectedIds)}
            >
              {t('job.apply', { n: selectedIds.length })}
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
}
