import { useMemo } from 'react';
import { Button, Paper, Select, Stack } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { CustomCellEditorProps } from 'ag-grid-react';
import { useTranslation } from 'react-i18next';
import type { OperationOption } from '../../types/operation';

export interface OperationEditorContext {
  operations: OperationOption[];
  requestOperation?: () => void;
}

/**
 * Popup editor backing both the Operation ID and the Description cell. The option list comes from the
 * grid context so the component stays free of data fetching; a value that is not in the list (a legacy
 * imported code) is appended so it stays visible and re-selectable.
 */
export function OperationCellEditor({
  value,
  onValueChange,
  stopEditing,
  colDef,
  context,
}: CustomCellEditorProps<unknown, string>) {
  const { t } = useTranslation(['operations']);
  const { operations, requestOperation } = context as OperationEditorContext;
  const useCode = colDef.field === 'operationId';

  const data = useMemo(() => {
    const byValue = new Map<string, string>();
    for (const operation of operations) {
      const optionValue = useCode ? operation.code : operation.description;
      if (!optionValue || byValue.has(optionValue)) continue;
      byValue.set(optionValue, `${operation.code} — ${operation.description}`);
    }
    if (value && !byValue.has(value)) byValue.set(value, `${value} (${t('picker.notInList')})`);
    return [...byValue].map(([optionValue, label]) => ({ value: optionValue, label }));
  }, [operations, useCode, value, t]);

  return (
    <Paper withBorder p="xs" w={340}>
      <Stack gap="xs">
        <Select
          data={data}
          value={value ?? null}
          onChange={(next) => {
            onValueChange(next ?? '');
            stopEditing();
          }}
          placeholder={t(useCode ? 'picker.selectCode' : 'picker.selectDescription')}
          nothingFoundMessage={t('picker.nothingFound')}
          searchable
          clearable
          defaultDropdownOpened
          comboboxProps={{ withinPortal: false }}
          maxDropdownHeight={260}
        />
        {requestOperation && (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              stopEditing(true);
              requestOperation();
            }}
          >
            {t('picker.requestNew')}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
