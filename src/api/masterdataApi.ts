import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiList } from "./apiTypes";

export interface SiteDto {
  siteId: number;
  name: string;
  addressJson: string | null;
  timezone: string;
  status: string;
}

export interface ServiceDto {
  serviceId: number;
  name: string;
  visitType: string;
  defaultDurationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  status: string;
}

export interface ProviderDto {
  providerId: number;
  name: string;
  specialty: string | null;
  credentials: string | null;
  contactInfo: string | null;
  status: string;
}

export interface RoomDto {
  roomId: number;
  roomName: string;
  roomType: string;
  siteId: number;
  attributesJson: string | null;
  status: string;
}

export interface SiteSearchParams {
  name?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export interface RoomSearchParams {
  roomName?: string;
  status?: string;
  siteId?: number;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchSites(params?: SiteSearchParams): Promise<SiteDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/sites", { params });
  return unwrapAxiosApiList<SiteDto>(res);
}

export async function fetchServices(): Promise<ServiceDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/services");
  return unwrapAxiosApiList<ServiceDto>(res);
}

export async function fetchProviders(): Promise<ProviderDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/providers");
  return unwrapAxiosApiList<ProviderDto>(res);
}

export async function fetchRooms(params?: RoomSearchParams): Promise<RoomDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/rooms", { params });
  return unwrapAxiosApiList<RoomDto>(res);
}

export async function fetchServicesByProvider(providerId: number): Promise<unknown[]> {
  const res = await api.get<ApiResponse<unknown>>(
    `/api/masterdata/providers/${providerId}/services`
  );
  return unwrapAxiosApiList<unknown>(res);
}
