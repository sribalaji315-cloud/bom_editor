import { useState } from 'react';
import {
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { t } = useTranslation(['common', 'errors']);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t('login.required', { ns: 'errors' }));
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError(t('login.invalid', { ns: 'errors' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="100vh" bg="dark.7">
      <Card shadow="md" padding="xl" radius="md" w={380}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <div>
              <Title order={3} c="nordBlue.6">
                {t('app.title')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('app.subtitle')}
              </Text>
            </div>
            <TextInput
              label={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              autoComplete="username"
            />
            <PasswordInput
              label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
            />
            {error && (
              <Text size="sm" c="nordRed.6">
                {error}
              </Text>
            )}
            <Button type="submit" loading={loading} fullWidth>
              {t('auth.signIn')}
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
