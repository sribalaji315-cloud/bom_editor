import { Alert, Badge, Drawer, Group, Loader, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ValidationIssue, ValidationReport } from '../../types/validation';

interface ValidationPanelProps {
  opened: boolean;
  report: ValidationReport | null;
  loading: boolean;
  onClose: () => void;
  onSelectIssue: (lineId: string) => void;
}

function IssueRow({
  issue,
  onSelect,
}: {
  issue: ValidationIssue;
  onSelect: (lineId: string) => void;
}) {
  const { t } = useTranslation(['validation']);
  const isError = issue.severity === 'Error';

  return (
    <UnstyledButton
      onClick={() => issue.lineId && onSelect(issue.lineId)}
      disabled={!issue.lineId}
      style={{ width: '100%' }}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {isError ? (
          <IconExclamationCircle size={16} color="var(--mantine-color-nordRed-6)" />
        ) : (
          <IconAlertTriangle size={16} color="var(--mantine-color-nordAmber-6)" />
        )}
        <Stack gap={2} style={{ flex: 1 }}>
          <Text size="sm">{issue.message}</Text>
          <Text size="xs" c="dimmed">
            {issue.lineDescription
              ? t('panel.onLine', { description: issue.lineDescription, code: issue.ruleCode })
              : t('panel.onDocument', { code: issue.ruleCode })}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

export function ValidationPanel({
  opened,
  report,
  loading,
  onClose,
  onSelectIssue,
}: ValidationPanelProps) {
  const { t } = useTranslation(['validation', 'common']);

  const errors = report?.issues.filter((i) => i.severity === 'Error') ?? [];
  const warnings = report?.issues.filter((i) => i.severity === 'Warning') ?? [];

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="lg" title={t('panel.title')}>
      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : !report ? (
        <Text c="dimmed">{t('panel.notRun')}</Text>
      ) : (
        <Stack gap="lg">
          <Group gap="xs">
            <Badge color="nordRed" variant="light">
              {t('panel.errors', { count: report.errorCount })}
            </Badge>
            <Badge color="nordAmber" variant="light">
              {t('panel.warnings', { count: report.warningCount })}
            </Badge>
          </Group>

          {report.issues.length === 0 && (
            <Alert color="nordGreen" icon={<IconCircleCheck size={18} />}>
              {t('panel.clean')}
            </Alert>
          )}

          {errors.length > 0 && (
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('panel.errorSection')}
              </Text>
              {errors.map((issue, index) => (
                <IssueRow key={`${issue.ruleCode}-${issue.lineId}-${index}`} issue={issue} onSelect={onSelectIssue} />
              ))}
            </Stack>
          )}

          {warnings.length > 0 && (
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('panel.warningSection')}
              </Text>
              {warnings.map((issue, index) => (
                <IssueRow key={`${issue.ruleCode}-${issue.lineId}-${index}`} issue={issue} onSelect={onSelectIssue} />
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
