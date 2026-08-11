import { Drawer, List, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface HelpPanelProps {
  opened: boolean;
  onClose: () => void;
  canEdit: boolean;
}

export function HelpPanel({ opened, onClose, canEdit }: HelpPanelProps) {
  const { t } = useTranslation(['bom']);

  const points = [
    t('help.tree'),
    canEdit ? t('help.edit') : t('help.readOnly'),
    t('help.actionField'),
    t('help.export'),
  ];

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" title={t('help.title')}>
      <Stack gap="md">
        <Text c="dimmed">{t('help.intro')}</Text>
        <List spacing="sm" icon={
          <ThemeIcon color="nordFrost" size={22} radius="xl">
            <IconInfoCircle size={14} />
          </ThemeIcon>
        }>
          {points.map((point) => (
            <List.Item key={point}>{point}</List.Item>
          ))}
        </List>
      </Stack>
    </Drawer>
  );
}
