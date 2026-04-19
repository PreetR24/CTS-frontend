import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface AppointmentDto {
  appointmentId: number;
  patientId: number;
  providerId: number;
  siteId: number;
  serviceId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: string;
  bookingChannel: string;
}

export interface AppointmentSearchParams {
  patientId?: number;
  providerId?: number;
  siteId?: number;
  date?: string;
  status?: string;
}

export interface CancelAppointmentPayload {
  reason?: string;
}

export async function searchAppointments(
  params?: AppointmentSearchParams
): Promise<AppointmentDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/appointments", { params });
  return unwrapAxiosApiList<AppointmentDto>(res);
}

export async function markAppointmentCheckedIn(appointmentId: number): Promise<void> {
  const res = await api.patch<ApiResponse<{ appointmentId: number }>>(
    `/appointments/${appointmentId}/checked-in`
  );
  unwrapAxiosApiData(res);
}

export async function cancelAppointment(
  appointmentId: number,
  payload: CancelAppointmentPayload = {}
): Promise<void> {
  const res = await api.patch<ApiResponse<object>>(
    `/appointments/${appointmentId}/cancel`,
    payload
  );
  unwrapAxiosApiData(res);
}

export interface WaitlistDto {
  waitId: number;
  siteId: number;
  providerId: number;
  serviceId: number;
  patientId: number;
  priority: string;
  requestedDate: string;
  status: string;
}

export interface WaitlistSearchParams {
  siteId?: number;
  providerId?: number;
  serviceId?: number;
  patientId?: number;
  status?: string;
}

export async function searchWaitlist(params?: WaitlistSearchParams): Promise<WaitlistDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/waitlist", { params });
  return unwrapAxiosApiList<WaitlistDto>(res);
}
