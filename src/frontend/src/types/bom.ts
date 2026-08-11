export type BomAction = 'Keep' | 'Add' | 'Delete';

export interface BomLineFields {
  action: BomAction;
  position: string | null;
  bsObjectId: string | null;
  legacySwingId: string | null;
  drawingNo: string | null;
  description: string | null;
  finalQuantity: string | null;
  constant: string | null;
  class: string | null;
  uom: string | null;
  isEbom: boolean;
  phantom: boolean;
  releaseTemplate: string | null;
  conditions: string | null;
  formula: string | null;
  route: string | null;
  bomExplosion: string | null;
  noOfPiecesInPack: string | null;
  weightKg: string | null;
  volumeM3: string | null;
}

export interface BomLine extends BomLineFields {
  id: string;
  parentId: string | null;
  sortOrder: number;
  level: number;
  isDeleted: boolean;
}

export interface BomDocumentSummary {
  id: string;
  name: string;
  sourceFileName: string | null;
  lineCount: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface BomDocumentDetail {
  id: string;
  name: string;
  sourceFileName: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  lines: BomLine[];
}

export type AuditChangeType = 'Create' | 'Update' | 'Delete' | 'Move' | 'Restore';

export interface BomAuditEntry {
  id: string;
  bomLineId: string | null;
  timestamp: string;
  userName: string | null;
  changeType: AuditChangeType;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export type CreateBomLineRequest = Partial<BomLineFields> & {
  parentId?: string | null;
  sortOrder?: number | null;
};

export type UpdateBomLineRequest = BomLineFields;

export interface MoveBomLineRequest {
  parentId: string | null;
  sortOrder: number;
}

export interface InsertBomRequest {
  sourceDocumentId: string;
  parentId: string | null;
  lineIds: string[];
}

export interface ImportColumn {
  index: number;
  header: string;
}

export interface ImportField {
  key: string;
  required: boolean;
}

export interface ImportInspectResult {
  columns: ImportColumn[];
  fields: ImportField[];
  suggestedMapping: Record<string, number>;
  sampleRows: string[][];
}

export type BomImportMapping = Record<string, number>;
