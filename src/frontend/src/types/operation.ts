export type OperationStatus = 'Requested' | 'Approved' | 'Rejected';

export interface Operation {
  id: string;
  code: string;
  description: string;
  status: OperationStatus;
  isActive: boolean;
  requestReason: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

/** Approved + active operations offered by the route operation picker. */
export interface OperationOption {
  code: string;
  description: string;
}

export interface CreateOperationRequest {
  code: string;
  description: string;
}

export interface UpdateOperationRequest {
  code: string;
  description: string;
  isActive: boolean;
}

export interface RequestOperationRequest {
  code: string;
  description: string;
  reason: string | null;
}

export interface ReviewOperationRequest {
  code: string | null;
  description: string | null;
}
