import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface SystemConfigDto {
  configId: number;
  key: string;
  value: string;
  scope: string;
  updatedBy: number | null;
  updatedDate: string;
}

export interface SystemConfigSearchParams {
  key?: string;
  scope?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export interface SystemConfigUpdatePayload {
  value?: string;
  scope?: string;
  updatedBy?: number;
}

export interface SystemConfigCreatePayload {
  key: string;
  value: string;
  scope?: string;
  updatedBy?: number;
}

export async function searchSystemConfigs(
  params?: SystemConfigSearchParams
): Promise<SystemConfigDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/admin/systemconfigs", { params });
  return unwrapAxiosApiList<SystemConfigDto>(res);
}

export async function updateSystemConfig(
  configId: number,
  payload: SystemConfigUpdatePayload
): Promise<SystemConfigDto> {
  const res = await api.put<ApiResponse<SystemConfigDto>>(
    `/api/admin/systemconfigs/${configId}`,
    payload
  );
  return unwrapAxiosApiData(res);
}

export async function getSystemConfigById(configId: number): Promise<SystemConfigDto> {
  const res = await api.get<ApiResponse<SystemConfigDto>>(`/api/admin/systemconfigs/${configId}`);
  return unwrapAxiosApiData(res);
}

export async function createSystemConfig(payload: SystemConfigCreatePayload): Promise<SystemConfigDto> {
  const res = await api.post<ApiResponse<SystemConfigDto>>("/api/admin/systemconfigs", payload);
  return unwrapAxiosApiData(res);
}

export async function deleteSystemConfig(configId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/admin/systemconfigs/${configId}`);
  unwrapAxiosApiData(res);
}
