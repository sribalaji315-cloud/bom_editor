import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Loader,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSparkles, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useAiSettings,
  useTestProvider,
  useUpdateAiSettings,
  useUploadGrounding,
} from '../hooks/useAi';
import { AI_PROVIDERS } from '../types/ai';
import type {
  AiContext,
  AiProvider,
  AiSettings,
  ProviderConfig,
  UpdateAiSettingsRequest,
} from '../types/ai';

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'string' && data.length > 0 ? data : fallback;
}

export function AiSettingsPage() {
  const { t } = useTranslation(['ai', 'common']);
  const { data, isLoading } = useAiSettings();
  const updateSettings = useUpdateAiSettings();
  const uploadGrounding = useUploadGrounding();
  const testProvider = useTestProvider();

  const [form, setForm] = useState<AiSettings | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  // Render-time sync (setState-in-effect is disallowed by lint); adopt the first loaded snapshot.
  if (data && form === null) {
    setForm(data);
  }

  const notifyError = (error: unknown, fallback: string) =>
    notifications.show({ color: 'nordRed', message: errorMessage(error, fallback) });

  const updateProvider = (provider: AiProvider, patch: Partial<ProviderConfig>) =>
    setForm((f) =>
      f
        ? { ...f, providers: f.providers.map((p) => (p.provider === provider ? { ...p, ...patch } : p)) }
        : f,
    );

  const updateInstruction = (context: AiContext, text: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            instructions: f.instructions.map((i) =>
              i.context === context ? { ...i, systemInstructions: text } : i,
            ),
          }
        : f,
    );

  const handleSave = () => {
    if (!form) return;
    const request: UpdateAiSettingsRequest = {
      activeProvider: form.activeProvider,
      groundingEnabled: form.groundingEnabled,
      providers: form.providers.map((p) => ({
        provider: p.provider,
        model: p.model,
        enabled: p.enabled,
        apiKey: keyInputs[p.provider]?.trim() ? keyInputs[p.provider] : null,
      })),
      instructions: form.instructions.map((i) => ({
        context: i.context,
        systemInstructions: i.systemInstructions,
      })),
    };
    updateSettings.mutate(request, {
      onSuccess: (updated) => {
        setForm(updated);
        setKeyInputs({});
        notifications.show({ color: 'nordGreen', message: t('saveSuccess') });
      },
      onError: (error) => notifyError(error, t('saveFailed')),
    });
  };

  const handleTest = (provider: AiProvider) =>
    testProvider.mutate(provider, {
      onSuccess: (result) =>
        notifications.show({
          color: result.success ? 'nordGreen' : 'nordRed',
          message: result.message,
        }),
      onError: (error) => notifyError(error, t('providers.testFailed')),
    });

  const handleUpload = (file: File | null) => {
    if (!file) return;
    uploadGrounding.mutate(file, {
      onSuccess: () =>
        notifications.show({ color: 'nordGreen', message: t('grounding.uploadSuccess') }),
      onError: (error) => notifyError(error, t('grounding.uploadFailed')),
    });
  };

  const instructionLabel = (context: AiContext) =>
    context === 'Bom' ? t('instructions.bom') : t('instructions.route');

  if (isLoading || !form) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('title')}</Title>
        <Text c="dimmed" size="sm">
          {t('subtitle')}
        </Text>
      </div>

      <Select
        label={t('activeProvider')}
        description={t('activeProviderHint')}
        data={AI_PROVIDERS.map((p) => ({ value: p, label: p }))}
        value={form.activeProvider}
        onChange={(value) =>
          value && setForm((f) => (f ? { ...f, activeProvider: value as AiProvider } : f))
        }
        allowDeselect={false}
        maw={320}
      />

      <Card withBorder padding="md">
        <Stack gap="sm">
          <div>
            <Title order={4}>{t('grounding.title')}</Title>
            <Text c="dimmed" size="sm">
              {t('grounding.description')}
            </Text>
          </div>
          <Switch
            label={t('grounding.enabled')}
            checked={form.groundingEnabled}
            onChange={(e) =>
              setForm((f) => (f ? { ...f, groundingEnabled: e.currentTarget.checked } : f))
            }
          />
          <Group gap="xs">
            <Text size="sm" fw={500}>
              {t('grounding.current')}:
            </Text>
            <Text size="sm" c={form.groundingFileName ? undefined : 'dimmed'}>
              {form.groundingFileName ?? t('grounding.none')}
            </Text>
          </Group>
          <FileInput
            label={t('grounding.upload')}
            accept="application/pdf"
            leftSection={<IconUpload size={16} />}
            onChange={handleUpload}
            disabled={uploadGrounding.isPending}
            maw={420}
            clearable
          />
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="md">
          <Title order={4}>{t('providers.title')}</Title>
          {form.providers.map((p) => (
            <Card key={p.provider} withBorder padding="sm" bg="dark.6">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600}>{p.provider}</Text>
                    <Badge color={p.hasKey ? 'nordGreen' : 'nordAmber'} variant="light">
                      {p.hasKey ? t('providers.keyStored') : t('providers.noKey')}
                    </Badge>
                  </Group>
                  <Switch
                    label={t('providers.enabled')}
                    checked={p.enabled}
                    onChange={(e) => updateProvider(p.provider, { enabled: e.currentTarget.checked })}
                  />
                </Group>
                <Group grow align="flex-end">
                  <TextInput
                    label={t('providers.model')}
                    description={t('providers.modelHint')}
                    value={p.model}
                    onChange={(e) => updateProvider(p.provider, { model: e.currentTarget.value })}
                  />
                  <PasswordInput
                    label={t('providers.apiKey')}
                    placeholder={
                      p.hasKey
                        ? t('providers.apiKeyPlaceholderSet')
                        : t('providers.apiKeyPlaceholderUnset')
                    }
                    value={keyInputs[p.provider] ?? ''}
                    onChange={(e) => {
                      // Read the value synchronously; the event is recycled before the updater runs.
                      const value = e.currentTarget.value;
                      setKeyInputs((prev) => ({ ...prev, [p.provider]: value }));
                    }}
                  />
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="xs">
                    {t('providers.testHint')}
                  </Text>
                  <Button
                    variant="light"
                    size="xs"
                    loading={testProvider.isPending}
                    onClick={() => handleTest(p.provider)}
                  >
                    {t('providers.test')}
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="md">
          <div>
            <Title order={4}>{t('instructions.title')}</Title>
            <Text c="dimmed" size="sm">
              {t('instructions.description')}
            </Text>
          </div>
          {form.instructions.map((i) => (
            <Textarea
              key={i.context}
              label={instructionLabel(i.context)}
              autosize
              minRows={3}
              maxRows={10}
              value={i.systemInstructions}
              onChange={(e) => updateInstruction(i.context, e.currentTarget.value)}
            />
          ))}
        </Stack>
      </Card>

      <Group justify="flex-end">
        <Button
          leftSection={<IconSparkles size={16} />}
          loading={updateSettings.isPending}
          onClick={handleSave}
        >
          {t('save')}
        </Button>
      </Group>
    </Stack>
  );
}
