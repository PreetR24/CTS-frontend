import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface ChargeDto {
  chargeRefId: number;
  appointmentId: number;
  serviceId: number;
  providerId: number;
  amount: number;
  currency: string;
  status: string;
}

export async function searchCharges(params?: {
  appointmentId?: number;
  providerId?: number;
  status?: string;
}): Promise<ChargeDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/charges", { params });
  return unwrapAxiosApiList<ChargeDto>(res);
}

export async function createCharge(payload: {
  appointmentId: number;
  serviceId: number;
  providerId: number;
  amount: number;
  currency?: string;
}): Promise<ChargeDto> {
  const res = await api.post<ApiResponse<ChargeDto>>("/charges", payload);
  return unwrapAxiosApiData(res);
}

export async function getChargesByAppointment(appointmentId: number): Promise<ChargeDto[]> {
  const res = await api.get<ApiResponse<ChargeDto>>(`/charges/appointment/${appointmentId}`);
  const single = unwrapAxiosApiData(res);
  return single ? [single] : [];
}
