import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface ResourceHoldDto {
  holdId: number;
  resourceType: string;
  resourceId: number;
  startTime: string;
  endTime: string;
  reason: string | null;
  status: string;
}

export async function searchResourceHolds(params?: {
  resourceType?: string;
  resourceId?: number;
  date?: string;
  status?: string;
}): Promise<ResourceHoldDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/resource-holds", { params });
  return unwrapAxiosApiList<ResourceHoldDto>(res);
}

export async function getResourceHoldById(holdId: number): Promise<ResourceHoldDto> {
  const res = await api.get<ApiResponse<ResourceHoldDto>>(`/resource-holds/${holdId}`);
  return unwrapAxiosApiData(res);
}

export async function createResourceHold(payload: {
  resourceType: string;
  resourceId: number;
  startTime: string;
  endTime: string;
  reason?: string;
}): Promise<ResourceHoldDto> {
  const res = await api.post<ApiResponse<ResourceHoldDto>>("/resource-holds", payload);
  return unwrapAxiosApiData(res);
}

export async function updateResourceHold(
  holdId: number,
  payload: {
    startTime?: string;
    endTime?: string;
    reason?: string;
    status?: string;
  }
): Promise<ResourceHoldDto> {
  const res = await api.put<ApiResponse<ResourceHoldDto>>(`/resource-holds/${holdId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deleteResourceHold(holdId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/resource-holds/${holdId}`);
  unwrapAxiosApiData(res);
}
