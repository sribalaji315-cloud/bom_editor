import { useEffect, useRef } from 'react';
import { Textarea } from '@mantine/core';
import type { CustomCellEditorProps } from 'ag-grid-react';

// Popup editor for long condition/formula text; sized via Mantine so it does not depend
// on AG Grid theme CSS.
export function LargeTextCellEditor({ value, onValueChange }: CustomCellEditorProps<unknown, string>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Textarea
      ref={ref}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.stopPropagation();
      }}
      autosize
      minRows={6}
      maxRows={18}
      maxLength={4000}
      w={360}
      p={4}
    />
  );
}
