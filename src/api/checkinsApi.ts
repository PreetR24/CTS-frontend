import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface CheckInDto {
  checkInId: number;
  appointmentId: number;
  tokenNo: string | null;
  checkInTime: string;
  roomAssigned: number | null;
  status: string;
}

export interface CheckInSearchParams {
  siteId?: number;
  providerId?: number;
  nurseId?: number;
  status?: string;
}

export async function createCheckIn(appointmentId: number, tokenNo?: string): Promise<CheckInDto> {
  const res = await api.post<ApiResponse<CheckInDto>>(`/checkin/${appointmentId}`, { tokenNo });
  return unwrapAxiosApiData(res);
}

export async function searchCheckIns(params?: CheckInSearchParams): Promise<CheckInDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/checkins", { params });
  return unwrapAxiosApiList<CheckInDto>(res);
}

export async function assignCheckInRoom(checkInId: number, roomId: number): Promise<CheckInDto> {
  const res = await api.patch<ApiResponse<CheckInDto>>(`/checkins/${checkInId}/assign-room`, { roomId });
  return unwrapAxiosApiData(res);
}

export async function moveCheckInToRoom(checkInId: number): Promise<CheckInDto> {
  const res = await api.patch<ApiResponse<CheckInDto>>(`/checkins/${checkInId}/in-room`);
  return unwrapAxiosApiData(res);
}

export async function setCheckInWithProvider(checkInId: number): Promise<CheckInDto> {
  const res = await api.patch<ApiResponse<CheckInDto>>(`/checkins/${checkInId}/with-provider`);
  return unwrapAxiosApiData(res);
}

export async function updateCheckInStatus(checkInId: number, status: string): Promise<CheckInDto> {
  const res = await api.patch<ApiResponse<CheckInDto>>(`/checkins/${checkInId}/status`, { status });
  return unwrapAxiosApiData(res);
}
