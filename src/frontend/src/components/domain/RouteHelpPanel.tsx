import { Drawer, List, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface RouteHelpPanelProps {
  opened: boolean;
  onClose: () => void;
  canEdit: boolean;
}

export function RouteHelpPanel({ opened, onClose, canEdit }: RouteHelpPanelProps) {
  const { t } = useTranslation(['route']);

  const points = [
    t('help.code'),
    t('help.operations'),
    canEdit ? t('help.edit') : t('help.readOnly'),
    t('help.import'),
    t('help.export'),
  ];

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" title={t('help.title')}>
      <Stack gap="md">
        <Text c="dimmed">{t('help.intro')}</Text>
        <List
          spacing="sm"
          icon={
            <ThemeIcon color="nordFrost" size={22} radius="xl">
              <IconInfoCircle size={14} />
            </ThemeIcon>
          }
        >
          {points.map((point) => (
            <List.Item key={point}>{point}</List.Item>
          ))}
        </List>
      </Stack>
    </Drawer>
  );
}
