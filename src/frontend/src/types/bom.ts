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
  conditionsPlm: string | null;
  formula: string | null;
  formulaPlm: string | null;
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
  concurrencyStamp: string;
}

export type BomDocumentStatus = 'Draft' | 'InReview' | 'Approved' | 'Released';

export interface BomDocumentSummary {
  id: string;
  name: string;
  sourceFileName: string | null;
  lineCount: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  status: BomDocumentStatus;
}

export interface BomDocumentDetail {
  id: string;
  name: string;
  sourceFileName: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  status: BomDocumentStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  lines: BomLine[];
}

export type AuditChangeType = 'Create' | 'Update' | 'Delete' | 'Move' | 'Restore' | 'Status';

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

export type UpdateBomLineRequest = BomLineFields & { concurrencyStamp?: string };

export interface MoveBomLineRequest {
  parentId: string | null;
  sortOrder: number;
  concurrencyStamp?: string;
}

export interface ChangeBomStatusRequest {
  status: BomDocumentStatus;
  comment: string | null;
}

export interface BomDocumentVersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  status: BomDocumentStatus;
  createdAt: string;
  createdBy: string | null;
  lineCount: number;
}

export interface CreateBomVersionRequest {
  label: string | null;
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
