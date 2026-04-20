import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface HolidayDto {
  holidayId: number;
  siteId: number;
  date: string;
  description: string | null;
  status: string;
}

export interface HolidaySearchParams {
  siteId?: number;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export interface HolidayCreatePayload {
  siteId: number;
  date: string;
  description?: string;
}

export async function searchHolidays(params?: HolidaySearchParams): Promise<HolidayDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/admin/holidays", { params });
  return unwrapAxiosApiList<HolidayDto>(res);
}

export async function createHoliday(payload: HolidayCreatePayload): Promise<HolidayDto> {
  const res = await api.post<ApiResponse<HolidayDto>>("/api/admin/holidays", payload);
  return unwrapAxiosApiData(res);
}

export async function getHolidayById(id: number): Promise<HolidayDto> {
  const res = await api.get<ApiResponse<HolidayDto>>(`/api/admin/holidays/${id}`);
  return unwrapAxiosApiData(res);
}

export async function getHolidayByDate(siteId: number, date: string): Promise<HolidayDto | null> {
  const res = await api.get<ApiResponse<HolidayDto>>(`/api/admin/holidays/by-date/${siteId}/${date}`);
  return unwrapAxiosApiData(res);
}

export async function updateHoliday(
  id: number,
  payload: Partial<{ siteId: number; date: string; description: string; status: string }>
): Promise<HolidayDto> {
  const res = await api.put<ApiResponse<HolidayDto>>(`/api/admin/holidays/${id}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateHoliday(id: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/admin/holidays/${id}`);
  unwrapAxiosApiData(res);
}

export async function activateHoliday(id: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/admin/holidays/${id}/activate`);
  unwrapAxiosApiData(res);
}
