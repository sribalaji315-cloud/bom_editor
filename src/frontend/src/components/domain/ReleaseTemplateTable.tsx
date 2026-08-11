import { ActionIcon, Badge, Menu, Table } from '@mantine/core';
import { IconDots, IconEdit, IconToggleLeft, IconToggleRight, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReleaseTemplate } from '../../types/releaseTemplate';

interface ReleaseTemplateTableProps {
  templates: ReleaseTemplate[];
  onEdit: (template: ReleaseTemplate) => void;
  onToggleActive: (template: ReleaseTemplate) => void;
  onDelete: (template: ReleaseTemplate) => void;
}

export function ReleaseTemplateTable({
  templates,
  onEdit,
  onToggleActive,
  onDelete,
}: ReleaseTemplateTableProps) {
  const { t } = useTranslation(['releaseTemplates']);

  return (
    <Table.ScrollContainer minWidth={480}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('table.name')}</Table.Th>
            <Table.Th>{t('table.status')}</Table.Th>
            <Table.Th w={60}>{t('table.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {templates.map((template) => (
            <Table.Tr key={template.id}>
              <Table.Td>{template.name}</Table.Td>
              <Table.Td>
                <Badge color={template.isActive ? 'nordGreen' : 'gray'} variant="light">
                  {template.isActive ? t('status.active') : t('status.inactive')}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label={t('table.actions')}>
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit(template)}>
                      {t('actions.edit')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={
                        template.isActive ? (
                          <IconToggleLeft size={16} />
                        ) : (
                          <IconToggleRight size={16} />
                        )
                      }
                      onClick={() => onToggleActive(template)}
                    >
                      {template.isActive ? t('actions.deactivate') : t('actions.activate')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="nordRed"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => onDelete(template)}
                    >
                      {t('actions.delete')}
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
