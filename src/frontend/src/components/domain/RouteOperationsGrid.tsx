import { useCallback, useMemo } from 'react';
import { ActionIcon, Group } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconSparkles, IconTrash } from '@tabler/icons-react';
import { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from 'ag-grid-community';
import { useTranslation } from 'react-i18next';
import type {
  RouteOperation,
  RouteOperationFields,
  UpdateRouteOperationRequest,
} from '../../types/route';
import type { AiFieldType } from '../../types/ai';
import type { OperationOption } from '../../types/operation';
import { LargeTextCellEditor } from '../ui/LargeTextCellEditor';
import { OperationCellEditor } from '../ui/OperationCellEditor';

export type MoveDirection = 'up' | 'down';

interface RouteOperationsGridProps {
  operations: RouteOperation[];
  canEdit: boolean;
  operationOptions: OperationOption[];
  onUpdate: (operationId: string, request: UpdateRouteOperationRequest) => void;
  onDelete: (operation: RouteOperation) => void;
  onMove: (operation: RouteOperation, direction: MoveDirection) => void;
  onTranslate?: (operation: RouteOperation, field: AiFieldType) => void;
  onRequestOperation?: () => void;
}

interface GridContext {
  canEdit: boolean;
  operations: OperationOption[];
  requestOperation?: () => void;
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
    conditionPlm: row.conditionPlm,
    formula: row.formula,
    formulaPlm: row.formulaPlm,
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
  operationOptions,
  onUpdate,
  onDelete,
  onMove,
  onTranslate,
  onRequestOperation,
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
      {
        field: 'operationId',
        headerName: t('columns.operationId'),
        editable: canEdit,
        width: 160,
        cellEditor: OperationCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'description',
        headerName: t('columns.description'),
        editable: canEdit,
        width: 240,
        cellEditor: OperationCellEditor,
        cellEditorPopup: true,
      },
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
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'conditionPlm',
        headerName: t('columns.conditionPlm'),
        editable: canEdit,
        width: 240,
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'formula',
        headerName: t('columns.formula'),
        editable: canEdit,
        width: 240,
        cellRenderer: ExpressionCell,
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
      },
      {
        field: 'formulaPlm',
        headerName: t('columns.formulaPlm'),
        editable: canEdit,
        width: 240,
        cellEditor: LargeTextCellEditor,
        cellEditorPopup: true,
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
    () => ({
      canEdit,
      operations: operationOptions,
      requestOperation: onRequestOperation,
      remove: onDelete,
      move: onMove,
      translate: onTranslate,
    }),
    [canEdit, operationOptions, onRequestOperation, onDelete, onMove, onTranslate],
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<RouteOperation>) => {
      const row = event.data;
      if (!row) return;

      // Operation ID and Description are two views of the same definition: keep them in step.
      const field = event.colDef.field;
      if (field === 'operationId' || field === 'description') {
        const match = operationOptions.find((option) =>
          field === 'operationId' ? option.code === row.operationId : option.description === row.description,
        );
        if (match) {
          const pairedField = field === 'operationId' ? 'description' : 'operationId';
          const pairedValue = field === 'operationId' ? match.description : match.code;
          if (row[pairedField] !== pairedValue) {
            row[pairedField] = pairedValue;
            event.api.refreshCells({
              rowNodes: [event.node],
              columns: [pairedField],
              force: true,
            });
          }
        }
      }

      onUpdate(row.id, toUpdateRequest(row));
    },
    [onUpdate, operationOptions],
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
