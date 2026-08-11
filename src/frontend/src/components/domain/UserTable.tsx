import { ActionIcon, Badge, Group, Menu, Table, Text } from '@mantine/core';
import {
  IconDots,
  IconKey,
  IconLock,
  IconLockOpen,
  IconTrash,
  IconUserEdit,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '../../types/user';

interface UserTableProps {
  users: UserSummary[];
  currentUserId: string;
  onEditRoles: (user: UserSummary) => void;
  onResetPassword: (user: UserSummary) => void;
  onToggleEnabled: (user: UserSummary) => void;
  onDelete: (user: UserSummary) => void;
}

export function UserTable({
  users,
  currentUserId,
  onEditRoles,
  onResetPassword,
  onToggleEnabled,
  onDelete,
}: UserTableProps) {
  const { t } = useTranslation(['users', 'common']);

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('table.email')}</Table.Th>
            <Table.Th>{t('table.displayName')}</Table.Th>
            <Table.Th>{t('table.roles')}</Table.Th>
            <Table.Th>{t('table.status')}</Table.Th>
            <Table.Th w={60}>{t('table.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <Table.Tr key={user.id}>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>{user.displayName ?? '—'}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {user.roles.length === 0 && <Text c="dimmed">—</Text>}
                    {user.roles.map((role) => (
                      <Badge key={role} variant="light" color="nordFrost">
                        {t(`roles.${role}`, { ns: 'common' })}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={user.isEnabled ? 'nordGreen' : 'nordRed'} variant="light">
                    {user.isEnabled ? t('status.enabled') : t('status.disabled')}
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
                      <Menu.Item
                        leftSection={<IconUserEdit size={16} />}
                        onClick={() => onEditRoles(user)}
                      >
                        {t('actions.editRoles')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconKey size={16} />}
                        onClick={() => onResetPassword(user)}
                      >
                        {t('actions.resetPassword')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          user.isEnabled ? <IconLock size={16} /> : <IconLockOpen size={16} />
                        }
                        disabled={isSelf}
                        onClick={() => onToggleEnabled(user)}
                      >
                        {user.isEnabled ? t('actions.disable') : t('actions.enable')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="nordRed"
                        leftSection={<IconTrash size={16} />}
                        disabled={isSelf}
                        onClick={() => onDelete(user)}
                      >
                        {t('actions.delete')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
