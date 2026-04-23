import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface AvailabilityBlockDto {
  blockId: number;
  providerId: number;
  siteId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
}

export async function searchAvailabilityBlocks(
  providerId: number,
  siteId: number,
  date?: string
): Promise<AvailabilityBlockDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/availability-blocks", {
    params: { providerId, siteId, date },
  });
  return unwrapAxiosApiList<AvailabilityBlockDto>(res);
}

export async function createAvailabilityBlock(payload: {
  providerId: number;
  siteId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}): Promise<number> {
  const res = await api.post<ApiResponse<{ id: number }>>("/availability-blocks", payload);
  return unwrapAxiosApiData(res).id;
}

export async function deleteAvailabilityBlock(blockId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/availability-blocks/${blockId}`);
  unwrapAxiosApiData(res);
}

export async function activateAvailabilityBlock(blockId: number): Promise<void> {
  const res = await api.patch<ApiResponse<object>>(`/availability-blocks/${blockId}/activate`);
  unwrapAxiosApiData(res);
}
