export interface RouteHeaderFields {
  code: string;
  routeNumber: string | null;
  name: string | null;
  isActive: boolean;
}

export interface RouteOperationFields {
  operationNo: string | null;
  operationId: string | null;
  description: string | null;
  descriptionLen: string | null;
  nextOperation: string | null;
  swingWc: string | null;
  runtimeType: string | null;
  setUpTime: string | null;
  time: string | null;
  resourceId: string | null;
  resourceGroup: string | null;
  routeGroupId: string | null;
  priority: string | null;
  condition: string | null;
  formula: string | null;
}

export interface RouteOperation extends RouteOperationFields {
  id: string;
  sortOrder: number;
}

export interface RouteSummary {
  id: string;
  code: string;
  name: string | null;
  routeNumber: string | null;
  operationCount: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface RouteDetail extends RouteHeaderFields {
  id: string;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  operations: RouteOperation[];
}

export type AuditChangeType = 'Create' | 'Update' | 'Delete' | 'Move';

export interface RouteAuditEntry {
  id: string;
  routeOperationId: string | null;
  timestamp: string;
  userName: string | null;
  changeType: AuditChangeType;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export type CreateRouteRequest = RouteHeaderFields;
export type UpdateRouteRequest = RouteHeaderFields;

export type CreateRouteOperationRequest = Partial<RouteOperationFields> & {
  sortOrder?: number | null;
};

export type UpdateRouteOperationRequest = RouteOperationFields;

export interface MoveRouteOperationRequest {
  sortOrder: number;
}

export interface RouteImportResult {
  created: number;
  updated: number;
  totalOperations: number;
}
