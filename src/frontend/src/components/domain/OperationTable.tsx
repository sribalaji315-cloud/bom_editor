import { ActionIcon, Badge, Menu, Table, Text, Tooltip } from '@mantine/core';
import {
  IconCheck,
  IconDots,
  IconEdit,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Operation, OperationStatus } from '../../types/operation';

const STATUS_COLOR: Record<OperationStatus, string> = {
  Requested: 'nordAmber',
  Approved: 'nordGreen',
  Rejected: 'nordRed',
};

interface OperationTableProps {
  operations: Operation[];
  canEdit: boolean;
  onEdit: (operation: Operation) => void;
  onApprove: (operation: Operation) => void;
  onReject: (operation: Operation) => void;
  onToggleActive: (operation: Operation) => void;
  onDelete: (operation: Operation) => void;
}

export function OperationTable({
  operations,
  canEdit,
  onEdit,
  onApprove,
  onReject,
  onToggleActive,
  onDelete,
}: OperationTableProps) {
  const { t } = useTranslation(['operations']);

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('table.code')}</Table.Th>
            <Table.Th>{t('table.description')}</Table.Th>
            <Table.Th>{t('table.status')}</Table.Th>
            <Table.Th>{t('table.requestedBy')}</Table.Th>
            {canEdit && <Table.Th w={60}>{t('table.actions')}</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {operations.map((operation) => {
            const isPending = operation.status === 'Requested';
            return (
              <Table.Tr key={operation.id}>
                <Table.Td>{operation.code}</Table.Td>
                <Table.Td>{operation.description}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[operation.status]} variant="light">
                    {t(`status.${operation.status}`)}
                  </Badge>
                  {operation.status === 'Approved' && !operation.isActive && (
                    <Badge color="gray" variant="light" ml="xs">
                      {t('status.inactive')}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  {operation.requestedBy ? (
                    <Tooltip
                      label={operation.requestReason ?? t('table.noReason')}
                      multiline
                      w={260}
                    >
                      <Text size="sm">{operation.requestedBy}</Text>
                    </Tooltip>
                  ) : (
                    <Text size="sm" c="dimmed">
                      {t('table.systemOrigin')}
                    </Text>
                  )}
                </Table.Td>
                {canEdit && (
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label={t('table.actions')}>
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={16} />}
                          onClick={() => onEdit(operation)}
                        >
                          {t('actions.edit')}
                        </Menu.Item>
                        {isPending && (
                          <>
                            <Menu.Item
                              color="nordGreen"
                              leftSection={<IconCheck size={16} />}
                              onClick={() => onApprove(operation)}
                            >
                              {t('actions.approve')}
                            </Menu.Item>
                            <Menu.Item
                              color="nordRed"
                              leftSection={<IconX size={16} />}
                              onClick={() => onReject(operation)}
                            >
                              {t('actions.reject')}
                            </Menu.Item>
                          </>
                        )}
                        {!isPending && (
                          <Menu.Item
                            leftSection={
                              operation.isActive ? (
                                <IconToggleLeft size={16} />
                              ) : (
                                <IconToggleRight size={16} />
                              )
                            }
                            onClick={() => onToggleActive(operation)}
                          >
                            {operation.isActive ? t('actions.deactivate') : t('actions.activate')}
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                        <Menu.Item
                          color="nordRed"
                          leftSection={<IconTrash size={16} />}
                          onClick={() => onDelete(operation)}
                        >
                          {t('actions.delete')}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
