import { useCallback, useMemo } from 'react';
import { ActionIcon, Group } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconSparkles, IconTrash } from '@tabler/icons-react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useTranslation } from 'react-i18next';
import type {
  RouteOperation,
  RouteOperationFields,
  UpdateRouteOperationRequest,
} from '../../types/route';
import type { AiFieldType } from '../../types/ai';

export type MoveDirection = 'up' | 'down';

interface RouteOperationsGridProps {
  operations: RouteOperation[];
  canEdit: boolean;
  onUpdate: (operationId: string, request: UpdateRouteOperationRequest) => void;
  onDelete: (operation: RouteOperation) => void;
  onMove: (operation: RouteOperation, direction: MoveDirection) => void;
  onTranslate?: (operation: RouteOperation, field: AiFieldType) => void;
}

interface GridContext {
  canEdit: boolean;
  remove: (operation: RouteOperation) => void;
  move: (operation: RouteOperation, direction: MoveDirection) => void;
  translate?: (operation: RouteOperation, field: AiFieldType) => void;
}

function toUpdateRequest(row: RouteOperation): UpdateRouteOperationRequest {
  const fields: RouteOperationFields = {
    operationNo: row.operationNo,
    operationId: row.operationId,
    description: row.description,
    descriptionLen: row.descriptionLen,
    nextOperation: row.nextOperation,
    swingWc: row.swingWc,
    runtimeType: row.runtimeType,
    setUpTime: row.setUpTime,
    time: row.time,
    resourceId: row.resourceId,
    resourceGroup: row.resourceGroup,
    routeGroupId: row.routeGroupId,
    priority: row.priority,
    condition: row.condition,
    formula: row.formula,
  };
  return fields;
}

function ActionsCell(params: ICellRendererParams<RouteOperation>) {
  const row = params.data;
  const context = params.context as GridContext;
  if (!row || !context.canEdit) return null;
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" size="sm" color="nordBlue" onClick={() => context.move(row, 'up')}>
        <IconArrowUp size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordBlue" onClick={() => context.move(row, 'down')}>
        <IconArrowDown size={14} />
      </ActionIcon>
      <ActionIcon variant="subtle" size="sm" color="nordRed" onClick={() => context.remove(row)}>
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}

function ExpressionCell(params: ICellRendererParams<RouteOperation>) {
  const row = params.data;
  const context = params.context as GridContext;
  const field: AiFieldType = params.colDef?.field === 'formula' ? 'formula' : 'condition';
  if (!row) return null;
  return (
    <Group gap={4} wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {(params.value as string) ?? ''}
      </span>
      {context.canEdit && context.translate && (
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

export function RouteOperationsGrid({
  operations,
  canEdit,
  onUpdate,
  onDelete,
  onMove,
  onTranslate,
}: RouteOperationsGridProps) {
  const { t } = useTranslation(['route']);

  const columnDefs = useMemo<ColDef<RouteOperation>[]>(() => {
    const text = (
      field: keyof RouteOperation,
      headerKey: string,
      width?: number,
    ): ColDef<RouteOperation> => ({
      field,
      headerName: t(`columns.${headerKey}`),
      editable: canEdit,
      width,
    });

    return [
      text('operationNo', 'operationNo', 120),
      text('operationId', 'operationId', 130),
      text('description', 'description', 220),
      text('descriptionLen', 'descriptionLen', 130),
      text('nextOperation', 'nextOperation', 130),
      text('swingWc', 'swingWc', 110),
      text('runtimeType', 'runtimeType', 120),
      text('setUpTime', 'setUpTime', 110),
      text('time', 'time', 90),
      text('resourceId', 'resourceId', 120),
      text('resourceGroup', 'resourceGroup', 140),
      text('routeGroupId', 'routeGroupId', 140),
      text('priority', 'priority', 110),
      {
        field: 'condition',
        headerName: t('columns.condition'),
        editable: canEdit,
        width: 240,
        cellRenderer: ExpressionCell,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorParams: { maxLength: 4000, rows: 8, cols: 60 },
      },
      {
        field: 'formula',
        headerName: t('columns.formula'),
        editable: canEdit,
        width: 240,
        cellRenderer: ExpressionCell,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorParams: { maxLength: 4000, rows: 8, cols: 60 },
      },
      {
        headerName: '',
        colId: 'actions',
        cellRenderer: ActionsCell,
        width: 110,
        pinned: 'right',
        editable: false,
        sortable: false,
        filter: false,
        hide: !canEdit,
      },
    ];
  }, [canEdit, t]);

  const context = useMemo<GridContext>(
    () => ({ canEdit, remove: onDelete, move: onMove, translate: onTranslate }),
    [canEdit, onDelete, onMove, onTranslate],
  );

  const onCellValueChanged = useCallback(
    (event: { data?: RouteOperation }) => {
      if (!event.data) return;
      onUpdate(event.data.id, toUpdateRequest(event.data));
    },
    [onUpdate],
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AgGridReact<RouteOperation>
        rowData={operations}
        columnDefs={columnDefs}
        context={context}
        getRowId={(p) => p.data.id}
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
        singleClickEdit={false}
        stopEditingWhenCellsLoseFocus
        onCellValueChanged={onCellValueChanged}
      />
    </div>
  );
}
