import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiDataAllowNull, unwrapAxiosApiList } from "./apiTypes";

export interface AvailabilityTemplateDto {
  templateId: number;
  providerId: number;
  siteId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  status: string;
}

export interface CreateAvailabilityTemplatePayload {
  providerId: number;
  siteId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  status?: string;
}

export interface IdResponseDto {
  id: number;
}

export async function fetchAvailabilityTemplates(
  providerId: number,
  siteId: number
): Promise<AvailabilityTemplateDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/availability-templates", {
    params: { providerId, siteId },
  });
  return unwrapAxiosApiList<AvailabilityTemplateDto>(res);
}

export async function createAvailabilityTemplate(
  payload: CreateAvailabilityTemplatePayload
): Promise<number> {
  const res = await api.post<ApiResponse<IdResponseDto>>("/availability-templates", {
    ...payload,
    status: payload.status ?? "Active",
  });
  return unwrapAxiosApiData(res).id;
}

export async function updateAvailabilityTemplate(
  templateId: number,
  payload: CreateAvailabilityTemplatePayload
): Promise<void> {
  const res = await api.put<ApiResponse<object>>(`/availability-templates/${templateId}`, payload);
  unwrapAxiosApiDataAllowNull(res);
}
