import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface SlotDto {
  pubSlotId: number;
  providerId: number;
  serviceId: number;
  siteId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface SlotSearchParams {
  providerId: number;
  serviceId: number;
  siteId: number;
  date: string;
}

export async function searchOpenSlots(params: SlotSearchParams): Promise<SlotDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/slots", { params });
  return unwrapAxiosApiList<SlotDto>(res);
}

export async function generateSlotsFromTemplate(payload: {
  templateId: number;
  siteId: number;
  days?: number;
}): Promise<{
  insertedCount: number;
  skippedExistingCount: number;
  cancelledDueToConflict: boolean;
  conflicts: Array<{
    templateId: number;
    providerId: number;
    siteId: number;
    date: string;
    startTime: string;
    endTime: string;
    existingSlotId: number;
    existingStatus: string;
  }>;
}> {
  const res = await api.post<ApiResponse<any>>("/slots/generate", payload);
  return unwrapAxiosApiData(res);
}
