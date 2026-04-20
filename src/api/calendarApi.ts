import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface CalendarEventDto {
  eventId: number;
  entityType: string;
  entityId: number;
  providerId: number | null;
  siteId: number;
  roomId: number | null;
  startTime: string;
  endTime: string;
  status: string;
}

export interface CalendarSearchParams {
  providerId?: number;
  siteId?: number;
  date?: string;
}

export async function searchCalendarEvents(
  params: CalendarSearchParams
): Promise<CalendarEventDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/calendar", { params });
  return unwrapAxiosApiList<CalendarEventDto>(res);
}

export async function getCalendarEventById(eventId: number): Promise<CalendarEventDto> {
  const res = await api.get<ApiResponse<CalendarEventDto>>(`/calendar/${eventId}`);
  return unwrapAxiosApiData(res);
}
