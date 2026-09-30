import type { ReactNode } from 'react';
import { AppShell, Badge, Burger, Button, Group, NavLink, ScrollArea, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFiles, IconListCheck, IconLogout, IconRoute, IconSparkles, IconTemplate, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['common']);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const go = (path: string) => {
    navigate(path);
    closeMobile();
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
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
            <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => go('/')}>
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

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          <NavLink
            label={t('nav.boms')}
            leftSection={<IconFiles size={18} />}
            active={isActive('/')}
            onClick={() => go('/')}
          />
          <NavLink
            label={t('nav.routes')}
            leftSection={<IconRoute size={18} />}
            active={isActive('/routes')}
            onClick={() => go('/routes')}
          />
          {hasRole('Admin') && (
            <NavLink label={t('nav.admin')} defaultOpened>
              <NavLink
                label={t('nav.users')}
                leftSection={<IconUsers size={18} />}
                active={isActive('/admin/users')}
                onClick={() => go('/admin/users')}
              />
              <NavLink
                label={t('nav.releaseTemplates')}
                leftSection={<IconTemplate size={18} />}
                active={isActive('/admin/release-templates')}
                onClick={() => go('/admin/release-templates')}
              />
              <NavLink
                label={t('nav.validationRules')}
                leftSection={<IconListCheck size={18} />}
                active={isActive('/admin/validation-rules')}
                onClick={() => go('/admin/validation-rules')}
              />
              <NavLink
                label={t('nav.aiSettings')}
                leftSection={<IconSparkles size={18} />}
                active={isActive('/admin/ai-settings')}
                onClick={() => go('/admin/ai-settings')}
              />
            </NavLink>
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
