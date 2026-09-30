import { apiClient } from './client';
import type {
  CreateOperationRequest,
  Operation,
  OperationOption,
  RequestOperationRequest,
  ReviewOperationRequest,
  UpdateOperationRequest,
} from '../types/operation';

export async function getOperations(): Promise<Operation[]> {
  const { data } = await apiClient.get<Operation[]>('/operations');
  return data;
}

export async function getSelectableOperations(): Promise<OperationOption[]> {
  const { data } = await apiClient.get<OperationOption[]>('/operations/selectable');
  return data;
}

export async function createOperation(request: CreateOperationRequest): Promise<Operation> {
  const { data } = await apiClient.post<Operation>('/operations', request);
  return data;
}

export async function requestOperation(request: RequestOperationRequest): Promise<Operation> {
  const { data } = await apiClient.post<Operation>('/operations/requests', request);
  return data;
}

export async function updateOperation(
  id: string,
  request: UpdateOperationRequest,
): Promise<Operation> {
  const { data } = await apiClient.put<Operation>(`/operations/${id}`, request);
  return data;
}

export async function approveOperation(
  id: string,
  request: ReviewOperationRequest,
): Promise<Operation> {
  const { data } = await apiClient.post<Operation>(`/operations/${id}/approve`, request);
  return data;
}

export async function rejectOperation(id: string): Promise<Operation> {
  const { data } = await apiClient.post<Operation>(`/operations/${id}/reject`);
  return data;
}

export async function deleteOperation(id: string): Promise<void> {
  await apiClient.delete(`/operations/${id}`);
}
