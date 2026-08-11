import type { ReactNode } from 'react';
import { AppShell, Badge, Burger, Button, Group, NavLink, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLayoutList, IconLogout, IconRoute, IconSparkles, IconTemplate, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['common']);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isRoutes = location.pathname.startsWith('/routes');
  const isTemplates = location.pathname.startsWith('/admin/release-templates');
  const isUsers = location.pathname.startsWith('/admin/users');
  const isAiSettings = location.pathname.startsWith('/admin/ai-settings');
  const isBoms = !isRoutes && !isTemplates && !isUsers && !isAiSettings;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
            <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <Title order={4} c="nordBlue.6">
                {t('app.title')}
              </Title>
            </Group>
          </Group>
          <Group gap="sm">
            {user && (
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {user.displayName ?? user.email}
                </Text>
                {user.roles.map((role) => (
                  <Badge key={role} variant="light" color="nordFrost">
                    {t(`roles.${role}`)}
                  </Badge>
                ))}
              </Group>
            )}
            <Button
              variant="subtle"
              color="nordRed"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        <NavLink
          label={t('nav.boms')}
          leftSection={<IconLayoutList size={18} />}
          active={isBoms}
          onClick={() => navigate('/')}
        />
        <NavLink
          label={t('nav.routes')}
          leftSection={<IconRoute size={18} />}
          active={isRoutes}
          onClick={() => navigate('/routes')}
        />
        {hasRole('Admin') && (
          <NavLink
            label={t('nav.releaseTemplates')}
            leftSection={<IconTemplate size={18} />}
            active={isTemplates}
            onClick={() => navigate('/admin/release-templates')}
          />
        )}
        {hasRole('Admin') && (
          <NavLink
            label={t('nav.users')}
            leftSection={<IconUsers size={18} />}
            active={isUsers}
            onClick={() => navigate('/admin/users')}
          />
        )}
        {hasRole('Admin') && (
          <NavLink
            label={t('nav.aiSettings')}
            leftSection={<IconSparkles size={18} />}
            active={isAiSettings}
            onClick={() => navigate('/admin/ai-settings')}
          />
        )}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
