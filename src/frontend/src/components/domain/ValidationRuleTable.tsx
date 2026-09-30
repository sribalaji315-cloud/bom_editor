import { ActionIcon, Badge, Menu, Table, Text } from '@mantine/core';
import { IconDots, IconEdit, IconToggleLeft, IconToggleRight, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ValidationRule } from '../../types/validation';

interface ValidationRuleTableProps {
  rules: ValidationRule[];
  onEdit: (rule: ValidationRule) => void;
  onToggleActive: (rule: ValidationRule) => void;
  onDelete: (rule: ValidationRule) => void;
}

export function ValidationRuleTable({
  rules,
  onEdit,
  onToggleActive,
  onDelete,
}: ValidationRuleTableProps) {
  const { t } = useTranslation(['validation']);

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('rules.columns.code')}</Table.Th>
            <Table.Th>{t('rules.columns.name')}</Table.Th>
            <Table.Th>{t('rules.columns.type')}</Table.Th>
            <Table.Th>{t('rules.columns.severity')}</Table.Th>
            <Table.Th>{t('rules.columns.targetField')}</Table.Th>
            <Table.Th>{t('rules.columns.parameters')}</Table.Th>
            <Table.Th>{t('rules.columns.appliesWhen')}</Table.Th>
            <Table.Th>{t('rules.columns.status')}</Table.Th>
            <Table.Th w={60}>{t('rules.columns.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rules.map((rule) => (
            <Table.Tr key={rule.id}>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {rule.code}
                </Text>
              </Table.Td>
              <Table.Td>{rule.name}</Table.Td>
              <Table.Td>{t(`rules.checkLabels.${rule.type}`)}</Table.Td>
              <Table.Td>
                <Badge color={rule.severity === 'Error' ? 'nordRed' : 'nordAmber'} variant="light">
                  {t(`rules.severity.${rule.severity}`)}
                </Badge>
              </Table.Td>
              <Table.Td>{rule.targetField ?? '\u2014'}</Table.Td>
              <Table.Td>{rule.parameters ?? '\u2014'}</Table.Td>
              <Table.Td>
                {rule.appliesWhen ? (
                  <Text size="sm" ff="monospace">
                    {rule.appliesWhen}
                  </Text>
                ) : (
                  t('rules.allLines')
                )}
              </Table.Td>
              <Table.Td>
                <Badge color={rule.isActive ? 'nordGreen' : 'gray'} variant="light">
                  {rule.isActive ? t('rules.status.active') : t('rules.status.inactive')}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label={t('rules.columns.actions')}>
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit(rule)}>
                      {t('rules.actions.edit')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={
                        rule.isActive ? <IconToggleLeft size={16} /> : <IconToggleRight size={16} />
                      }
                      onClick={() => onToggleActive(rule)}
                    >
                      {rule.isActive ? t('rules.actions.deactivate') : t('rules.actions.activate')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="nordRed"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => onDelete(rule)}
                    >
                      {t('rules.actions.delete')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
