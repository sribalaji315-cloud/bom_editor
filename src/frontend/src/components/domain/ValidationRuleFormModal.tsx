import { useMemo, useState } from 'react';
import {
  Anchor,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ConditionBuilder } from './ConditionBuilder';
import { parseConditions } from '../conditionExpression';
import { CHECK_USAGE } from '../validationChecks';
import type {
  ValidationMetadata,
  ValidationRule,
  ValidationRuleType,
  ValidationSeverity,
} from '../../types/validation';

export interface ValidationRuleFormValues {
  code: string;
  name: string;
  type: ValidationRuleType;
  severity: ValidationSeverity;
  targetField: string | null;
  parameters: string | null;
  appliesWhen: string | null;
  message: string | null;
  isActive: boolean;
}

interface ValidationRuleFormModalProps {
  opened: boolean;
  // When editing, the rule being edited; null when creating.
  rule: ValidationRule | null;
  metadata: ValidationMetadata | undefined;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: ValidationRuleFormValues) => void;
}

export function ValidationRuleFormModal({
  opened,
  rule,
  metadata,
  loading,
  onClose,
  onSubmit,
}: ValidationRuleFormModalProps) {
  const { t } = useTranslation(['validation', 'common']);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ValidationRuleType>('RequiredField');
  const [severity, setSeverity] = useState<ValidationSeverity>('Error');
  const [targetField, setTargetField] = useState<string | null>(null);
  const [parameters, setParameters] = useState('');
  const [appliesWhen, setAppliesWhen] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [textMode, setTextMode] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Seed the fields each time the modal opens (render-time state adjustment).
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setCode(rule?.code ?? '');
      setName(rule?.name ?? '');
      setType(rule?.type ?? 'RequiredField');
      setSeverity(rule?.severity ?? 'Error');
      setTargetField(rule?.targetField ?? null);
      setParameters(rule?.parameters ?? '');
      setAppliesWhen(rule?.appliesWhen ?? '');
      setMessage(rule?.message ?? '');
      setIsActive(rule?.isActive ?? true);
      setTextMode(false);
    }
  }

  // null means the expression is too unusual for the builder, so the text box takes over.
  const filterFields = useMemo(() => metadata?.filterFields ?? [], [metadata]);
  const builderRows = useMemo(
    () => parseConditions(appliesWhen, filterFields),
    [appliesWhen, filterFields],
  );
  const showText = textMode || builderRows === null;

  const isEdit = rule !== null;
  const canSubmit = code.trim().length > 0 && name.trim().length > 0;
  const usage = CHECK_USAGE[type];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(isEdit ? 'rules.form.editTitle' : 'rules.form.createTitle')}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t('rules.form.code')}
          placeholder={t('rules.form.codePlaceholder')}
          required
          disabled={isEdit}
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
        <TextInput
          label={t('rules.form.name')}
          placeholder={t('rules.form.namePlaceholder')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Select
          label={t('rules.form.type')}
          description={t(`rules.checks.${type}`)}
          data={(metadata?.ruleTypes ?? []).map((value) => ({
            value,
            label: t(`rules.checkLabels.${value}`),
          }))}
          value={type}
          onChange={(value) => value && setType(value as ValidationRuleType)}
          allowDeselect={false}
        />
        <Select
          label={t('rules.form.severity')}
          data={(metadata?.severities ?? []).map((value) => ({
            value,
            label: t(`rules.severity.${value}`),
          }))}
          value={severity}
          onChange={(value) => value && setSeverity(value as ValidationSeverity)}
          allowDeselect={false}
        />
        <Select
          label={t('rules.form.targetField')}
          description={
            usage.field === 'ignored'
              ? t('rules.form.notUsed')
              : t(`rules.form.targetFieldFor.${type}`)
          }
          data={metadata?.fields ?? []}
          value={targetField}
          onChange={setTargetField}
          disabled={usage.field === 'ignored'}
          clearable
          searchable
        />
        <TextInput
          label={t('rules.form.parameters')}
          description={
            usage.parameters === 'ignored'
              ? t('rules.form.notUsed')
              : t(`rules.form.parametersFor.${type}`)
          }
          placeholder={
            usage.parameters === 'ignored' ? undefined : t(`rules.form.parametersHintFor.${type}`)
          }
          value={parameters}
          onChange={(e) => setParameters(e.currentTarget.value)}
          disabled={usage.parameters === 'ignored'}
        />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {t('rules.form.appliesWhen')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('rules.form.appliesWhenIntro')}
          </Text>

          {showText ? (
            <Textarea
              description={t('rules.form.appliesWhenHint')}
              placeholder={t('rules.form.appliesWhenPlaceholder')}
              autosize
              minRows={2}
              value={appliesWhen}
              onChange={(e) => setAppliesWhen(e.currentTarget.value)}
            />
          ) : (
            <ConditionBuilder
              rows={builderRows ?? []}
              fields={filterFields}
              onChange={setAppliesWhen}
            />
          )}

          <Group gap="sm">
            <Anchor
              component="button"
              type="button"
              size="xs"
              onClick={() => setTextMode(!textMode)}
              disabled={builderRows === null}
            >
              {t(textMode ? 'rules.form.useBuilder' : 'rules.form.editAsText')}
            </Anchor>
            {builderRows === null && (
              <Text size="xs" c="nordAmber">
                {t('rules.form.notBuildable')}
              </Text>
            )}
          </Group>
        </Stack>

        <Textarea
          label={t('rules.form.message')}
          description={t('rules.form.messageHint')}
          autosize
          minRows={2}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        {isEdit && (
          <Switch
            label={t('rules.form.active')}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            loading={loading}
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                code: code.trim(),
                name: name.trim(),
                type,
                severity,
                targetField,
                parameters: parameters.trim() || null,
                appliesWhen: appliesWhen.trim() || null,
                message: message.trim() || null,
                isActive,
              })
            }
          >
            {t('rules.form.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
