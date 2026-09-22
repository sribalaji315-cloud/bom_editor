import { useCallback, useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconColumns,
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconArrowsMove,
  IconRestore,
  IconTrashX,
  IconSparkles,
} from '@tabler/icons-react';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  EditableCallbackParams,
  ICellEditorParams,
  ICellRendererParams,
  RowClassParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import { useTranslation } from 'react-i18next';
import type { BomLine, BomLineFields, UpdateBomLineRequest } from '../../types/bom';
import type { AiFieldType } from '../../types/ai';
import { LargeTextCellEditor } from '../ui/LargeTextCellEditor';
import { buildVisibleRows } from '../treeUtils';

export type MoveDirection = 'up' | 'down';

/** Columns the user can show or hide. The structure and row-action columns are always shown. */
const TOGGLEABLE_COLUMNS: { id: string; labelKey: string }[] = [
  { id: 'action', labelKey: 'action' },
  { id: 'description', labelKey: 'description' },
  { id: 'bsObjectId', labelKey: 'bsObjectId' },
  { id: 'legacySwingId', labelKey: 'legacySwingId' },
  { id: 'drawingNo', labelKey: 'drawingNo' },
  { id: 'finalQuantity', labelKey: 'finalQuantity' },
  { id: 'constant', labelKey: 'constant' },
  { id: 'class', labelKey: 'class' },
  { id: 'uom', labelKey: 'uom' },
  { id: 'isEbom', labelKey: 'isEbom' },
  { id: 'phantom', labelKey: 'phantom' },
  { id: 'releaseTemplate', labelKey: 'releaseTemplate' },
  { id: 'conditions', labelKey: 'conditions' },
  { id: 'conditionsPlm', labelKey: 'conditionsPlm' },
  { id: 'formula', labelKey: 'formula' },
  { id: 'formulaPlm', labelKey: 'formulaPlm' },
  { id: 'route', labelKey: 'route' },
  { id: 'bomExplosion', labelKey: 'bomExplosion' },
  { id: 'noOfPiecesInPack', labelKey: 'noOfPiecesInPack' },
  { id: 'weightKg', labelKey: 'weightKg' },
  { id: 'volumeM3', labelKey: 'volumeM3' },
];

interface BomTreeGridProps {
  lines: BomLine[];
  canEdit: boolean;
  releaseTemplateOptions: string[];
  onUpdate: (lineId: string, request: UpdateBomLineRequest) => void;
  onAddChild: (parent: BomLine | null) => void;
  onDelete: (line: BomLine) => void;
  onRestore: (line: BomLine) => void;
  onPurge: (line: BomLine) => void;
  onMove: (line: BomLine, direction: MoveDirection) => void;
  onMoveToParent: (line: BomLine) => void;
  onTranslate?: (line: BomLine, field: AiFieldType) => void;
}

interface GridRow extends BomLine {
  _depth: number;
  _hasChildren: boolean;
  _expanded: boolean;
}

interface GridContext {
  canEdit: boolean;
  toggle: (id: string) => void;
  addChild: (line: BomLine) => void;
  remove: (line: BomLine) => void;
  restore: (line: BomLine) => void;
  purge: (line: BomLine) => void;
  move: (line: BomLine, direction: MoveDirection) => void;
  moveToParent: (line: BomLine) => void;
  translate?: (line: BomLine, field: AiFieldType) => void;
}

function toUpdateRequest(row: GridRow): UpdateBomLineRequest {
  const fields: BomLineFields = {
    action: row.action,
    position: row.position,
    bsObjectId: row.bsObjectId,
    legacySwingId: row.legacySwingId,
    drawingNo: row.drawingNo,
    description: row.description,
    finalQuantity: row.finalQuantity,
    constant: row.constant,
    class: row.class,
    uom: row.uom,
    isEbom: row.isEbom,
    phantom: row.phantom,
    releaseTemplate: row.releaseTemplate,
    conditions: row.conditions,
    conditionsPlm: row.conditionsPlm,
    formula: row.formula,
    formulaPlm: row.formulaPlm,
    route: row.route,
    bomExplosion: row.bomExplosion,
    noOfPiecesInPack: row.noOfPiecesInPack,
    weightKg: row.weightKg,
    volumeM3: row.volumeM3,
  };
  return fields;
}

function StructureCell(params: ICellRendererParams<GridRow>) {
  const row = params.data;
  const context = params.context as GridContext;
  if (!row) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: (row._depth - 1) * 18 }}>
      {row._hasChildren ? (
        <ActionIcon
          variant="subtle"
          size="sm"
          color="nordBlue"
          onClick={() => context.toggle(row.id)}
          aria-label={row._expanded ? 'collapse' : 'expand'}
        >
          {row._expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </ActionIcon>
      ) : (
        <span style={{ display: 'inline-block', width: 26 }} />
      )}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.level}</span>
    </div>
  );
}

function ActionsCell(params: ICellRendererParams<GridRow>) {
  const row = params.data;
  const context = params.context as GridContext;
  if (!row || !context.canEdit) return null;
  if (row.isDeleted || row.action === 'Delete') {
    return (
      <Group gap={2} wrap="nowrap">
        <ActionIcon variant="subtle" size="sm" color="nordGreen" onClick={() => context.restore(row)}>
          <IconRestore size={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" size="sm" color="nordRed" onClick={() => context.purge(row)}>
          <IconTrashX size={14} />
        </ActionIcon>
      </Group>
    );
  }
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" size="sm" color="nordGreen" onClick={() => context.addChild(row)}>
        <IconPlus size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordBlue" onClick={() => context.move(row, 'up')}>
        <IconArrowUp size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordBlue" onClick={() => context.move(row, 'down')}>
        <IconArrowDown size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordBlue" onClick={() => context.moveToParent(row)}>
        <IconArrowsMove size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordRed" onClick={() => context.remove(row)}>
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}

// Natural-language source cell with a sparkle that translates into the adjacent PLM column.
function ExpressionCell(params: ICellRendererParams<GridRow>) {
  const row = params.data;
  const context = params.context as GridContext;
  const field: AiFieldType = params.colDef?.field === 'formula' ? 'formula' : 'condition';
  if (!row) return null;
  return (
    <Group gap={4} wrap="nowrap" align="center" justify="space-between" style={{ width: '100%' }}>
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={(params.value as string) ?? ''}
      >
        {(params.value as string) ?? ''}
      </span>
      {context.canEdit && context.translate && !row.isDeleted && (
        <ActionIcon
          variant="subtle"
          size="sm"
          color="nordFrost"
          aria-label="ai-translate"
          onClick={(e) => {
            e.stopPropagation();
            context.translate?.(row, field);
          }}
        >
          <IconSparkles size={14} />
        </ActionIcon>
      )}
    </Group>
  );
}

export function BomTreeGrid({
  lines,
  canEdit,
  releaseTemplateOptions,
  onUpdate,
  onAddChild,
  onDelete,
  onRestore,
  onPurge,
  onMove,
  onMoveToParent,
  onTranslate,
}: BomTreeGridProps) {
  const { t } = useTranslation(['bom']);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const toggleColumn = useCallback((id: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const rowData = useMemo<GridRow[]>(
    () =>
      buildVisibleRows(lines, collapsed).map((r) => ({
        ...r.line,
        _depth: r.depth,
        _hasChildren: r.hasChildren,
        _expanded: r.expanded,
      })),
    [lines, collapsed],
  );

  const yesNo = useCallback(
    (params: ValueFormatterParams) =>
      params.value ? t('Yes', { ns: 'common' }) : t('No', { ns: 'common' }),
    [t],
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
    const isEditable = (p: EditableCallbackParams<GridRow>) => canEdit && !p.data?.isDeleted;
    const text = (field: keyof GridRow, headerKey: string, width?: number): ColDef<GridRow> => ({
      field,
      headerName: t(`columns.${headerKey}`),
      editable: isEditable,
      width,
      hide: hiddenCols.has(field as string),
    });

    return [
      {
        headerName: '',
        colId: 'structure',
        cellRenderer: StructureCell,
        width: 130,
        pinned: 'left',
        editable: false,
        sortable: false,
        filter: false,
      },
      {
        field: 'action',
        headerName: t('columns.action'),
        editable: isEditable,
        width: 110,
        pinned: 'left',
        hide: hiddenCols.has('action'),
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Keep', 'Add', 'Delete'] },
        valueFormatter: (p: ValueFormatterParams) => (p.value ? t(`action.${p.value}`) : ''),
      },
      text('description', 'description', 260),
      text('bsObjectId', 'bsObjectId', 130),
      text('legacySwingId', 'legacySwingId', 130),
      text('drawingNo', 'drawingNo', 120),
      text('finalQuantity', 'finalQuantity', 110),
      text('constant', 'constant', 100),
      text('class', 'class', 130),
      text('uom', 'uom', 80),
      {
        field: 'isEbom',
        headerName: t('columns.isEbom'),
        editable: isEditable,
        width: 100,
        hide: hiddenCols.has('isEbom'),
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [true, false] },
        valueFormatter: yesNo,
      },
      {
        field: 'phantom',
        headerName: t('columns.phantom'),
        editable: isEditable,
        width: 100,
        hide: hiddenCols.has('phantom'),
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [true, false] },
        valueFormatter: yesNo,
      },
      {
        field: 'releaseTemplate',
        headerName: t('columns.releaseTemplate'),
        editable: isEditable,
        width: 160,
        hide: hiddenCols.has('releaseTemplate'),
        cellEditor: 'agSelectCellEditor',
        // Per-row values keep the row's current (possibly imported) value selectable.
        cellEditorParams: (p: ICellEditorParams<GridRow>) => {
          const values: string[] = ['', ...releaseTemplateOptions];
          const current = p.value as string | null;
          if (current && !values.includes(current)) values.push(current);
          return { values };
        },
      },
      {
        field: 'conditions',
        headerName: t('columns.conditions'),
        editable: isEditable,
        width: 220,
        hide: hiddenCols.has('conditions'),
        cellRenderer: ExpressionCell,
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'conditionsPlm',
        headerName: t('columns.conditionsPlm'),
        editable: isEditable,
        width: 220,
        hide: hiddenCols.has('conditionsPlm'),
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'formula',
        headerName: t('columns.formula'),
        editable: isEditable,
        width: 220,
        hide: hiddenCols.has('formula'),
        cellRenderer: ExpressionCell,
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'formulaPlm',
        headerName: t('columns.formulaPlm'),
        editable: isEditable,
        width: 220,
        hide: hiddenCols.has('formulaPlm'),
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      text('route', 'route', 100),
      text('bomExplosion', 'bomExplosion', 130),
      text('noOfPiecesInPack', 'noOfPiecesInPack', 120),
      text('weightKg', 'weightKg', 110),
      text('volumeM3', 'volumeM3', 110),
      {
        headerName: '',
        colId: 'actions',
        cellRenderer: ActionsCell,
        width: 130,
        pinned: 'right',
        editable: false,
        sortable: false,
        filter: false,
        hide: !canEdit,
      },
    ];
  }, [canEdit, t, yesNo, hiddenCols, releaseTemplateOptions]);

  const context = useMemo<GridContext>(
    () => ({
      canEdit,
      toggle,
      addChild: (line) => onAddChild(line),
      remove: onDelete,
      restore: onRestore,
      purge: onPurge,
      move: onMove,
      moveToParent: onMoveToParent,
      translate: onTranslate,
    }),
    [canEdit, toggle, onAddChild, onDelete, onRestore, onPurge, onMove, onMoveToParent, onTranslate],
  );

  const visibleCount = TOGGLEABLE_COLUMNS.length - hiddenCols.size;

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group justify="flex-end" mb="xs">
        <Popover width={240} position="bottom-end" withArrow shadow="md">
          <Popover.Target>
            <Button variant="light" size="xs" leftSection={<IconColumns size={16} />}>
              {t('columns.picker', { shown: visibleCount, total: TOGGLEABLE_COLUMNS.length })}
            </Button>
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <Group justify="space-between" mb={4}>
              <Button variant="subtle" size="compact-xs" onClick={() => setHiddenCols(new Set())}>
                {t('columns.showAll')}
              </Button>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => setHiddenCols(new Set(TOGGLEABLE_COLUMNS.map((c) => c.id)))}
              >
                {t('columns.hideAll')}
              </Button>
            </Group>
            <Divider mb="xs" />
            <ScrollArea.Autosize mah={320}>
              <Stack gap={6}>
                {TOGGLEABLE_COLUMNS.map((col) => (
                  <Checkbox
                    key={col.id}
                    size="xs"
                    label={t(`columns.${col.labelKey}`)}
                    checked={!hiddenCols.has(col.id)}
                    onChange={() => toggleColumn(col.id)}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Popover.Dropdown>
        </Popover>
      </Group>
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <AgGridReact<GridRow>
          rowData={rowData}
          columnDefs={columnDefs}
          context={context}
          getRowId={(p) => p.data.id}
          getRowStyle={(p: RowClassParams<GridRow>) =>
            p.data?.isDeleted || p.data?.action === 'Delete'
              ? { textDecoration: 'line-through', opacity: 0.55 }
              : undefined
          }
          defaultColDef={{ resizable: true, sortable: false, filter: false }}
          singleClickEdit={false}
          stopEditingWhenCellsLoseFocus
          onCellValueChanged={(event) => {
            if (!event.data) return;
            onUpdate(event.data.id, toUpdateRequest(event.data));
          }}
        />
      </div>
    </div>
  );
}
