import { ActionIcon, Button, Code, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  BOOLEAN_FIELDS,
  CONDITION_OPERATORS,
  LIST_OPERATORS,
  VALUELESS_OPERATORS,
  defaultRow,
  formatConditions,
  type ConditionJoiner,
  type ConditionRow,
} from '../conditionExpression';

interface ConditionBuilderProps {
  rows: ConditionRow[];
  fields: string[];
  onChange: (expression: string) => void;
}

export function ConditionBuilder({ rows, fields, onChange }: ConditionBuilderProps) {
  const { t } = useTranslation(['validation', 'common']);

  const update = (next: ConditionRow[]) => onChange(formatConditions(next));

  const patch = (index: number, changes: Partial<ConditionRow>) =>
    update(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  const operatorData = CONDITION_OPERATORS.map((op) => ({ value: op, label: op }));
  const booleanData = [
    { value: 'true', label: t('builder.true') },
    { value: 'false', label: t('builder.false') },
  ];

  return (
    <Stack gap="xs">
      {rows.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('builder.empty')}
        </Text>
      )}

      {rows.map((row, index) => (
        <Group key={index} gap="xs" align="flex-end" wrap="nowrap">
          {index === 0 ? (
            <Text size="sm" c="dimmed" w={56} ta="right">
              {t('builder.where')}
            </Text>
          ) : (
            <Select
              w={56}
              size="xs"
              data={[
                { value: 'and', label: t('builder.and') },
                { value: 'or', label: t('builder.or') },
              ]}
              value={row.joiner}
              onChange={(value) => value && patch(index, { joiner: value as ConditionJoiner })}
              allowDeselect={false}
              aria-label={t('builder.joiner')}
            />
          )}

          <Select
            size="xs"
            style={{ flex: 1.4 }}
            data={fields}
            value={row.field}
            onChange={(value) => value && patch(index, { field: value, value: '' })}
            searchable
            allowDeselect={false}
            aria-label={t('builder.field')}
          />

          <Select
            size="xs"
            w={110}
            data={operatorData}
            value={row.operator}
            onChange={(value) => value && patch(index, { operator: value })}
            allowDeselect={false}
            aria-label={t('builder.operator')}
          />

          {VALUELESS_OPERATORS.includes(row.operator) ? (
            <div style={{ flex: 1 }} />
          ) : BOOLEAN_FIELDS.includes(row.field) ? (
            <Select
              size="xs"
              style={{ flex: 1 }}
              data={booleanData}
              value={row.value || null}
              onChange={(value) => patch(index, { value: value ?? '' })}
              allowDeselect={false}
              aria-label={t('builder.value')}
            />
          ) : (
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              placeholder={
                LIST_OPERATORS.includes(row.operator)
                  ? t('builder.listPlaceholder')
                  : t('builder.valuePlaceholder')
              }
              value={row.value}
              onChange={(e) => patch(index, { value: e.currentTarget.value })}
              aria-label={t('builder.value')}
            />
          )}

          <ActionIcon
            variant="subtle"
            color="nordRed"
            onClick={() => update(rows.filter((_, i) => i !== index))}
            aria-label={t('builder.remove')}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Group justify="space-between">
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => update([...rows, defaultRow(fields[0] ?? 'phantom')])}
        >
          {t('builder.add')}
        </Button>
        {rows.length > 0 && (
          <Code>{formatConditions(rows)}</Code>
        )}
      </Group>
    </Stack>
  );
}
