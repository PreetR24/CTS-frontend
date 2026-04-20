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

export interface BookAppointmentPayload {
  publishedSlotId: number;
  patientId: number;
  bookingChannel?: string;
}

export interface RescheduleAppointmentPayload {
  newPublishedSlotId: number;
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

export async function bookAppointment(payload: BookAppointmentPayload): Promise<AppointmentDto> {
  const res = await api.post<ApiResponse<AppointmentDto>>("/appointments", {
    ...payload,
    bookingChannel: payload.bookingChannel ?? "FrontDesk",
  });
  return unwrapAxiosApiData(res);
}

export async function getAppointmentById(appointmentId: number): Promise<AppointmentDto> {
  const res = await api.get<ApiResponse<AppointmentDto>>(`/appointments/${appointmentId}`);
  return unwrapAxiosApiData(res);
}

export async function rescheduleAppointment(
  appointmentId: number,
  payload: RescheduleAppointmentPayload
): Promise<AppointmentDto> {
  const res = await api.patch<ApiResponse<AppointmentDto>>(`/appointments/${appointmentId}`, payload);
  return unwrapAxiosApiData(res);
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

export async function markAppointmentCompleted(appointmentId: number): Promise<void> {
  const res = await api.patch<ApiResponse<{ appointmentId: number }>>(
    `/appointments/${appointmentId}/complete`
  );
  unwrapAxiosApiData(res);
}

export async function markAppointmentNoShow(appointmentId: number): Promise<void> {
  const res = await api.patch<ApiResponse<{ appointmentId: number }>>(
    `/appointments/${appointmentId}/no-show`
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

export interface CreateWaitlistPayload {
  siteId: number;
  providerId: number;
  serviceId: number;
  patientId: number;
  priority?: string;
  requestedDate?: string;
}

export async function createWaitlist(payload: CreateWaitlistPayload): Promise<WaitlistDto> {
  const res = await api.post<ApiResponse<WaitlistDto>>("/waitlist", payload);
  return unwrapAxiosApiData(res);
}

export async function fillWaitlist(waitId: number, bookingChannel = "FrontDesk"): Promise<WaitlistDto> {
  const res = await api.patch<ApiResponse<WaitlistDto>>(`/waitlist/${waitId}/filled`, { bookingChannel });
  return unwrapAxiosApiData(res);
}

export async function removeWaitlist(waitId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/waitlist/${waitId}`);
  unwrapAxiosApiData(res);
}
