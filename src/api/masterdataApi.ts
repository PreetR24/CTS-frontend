import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

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

export async function getSiteById(siteId: number): Promise<SiteDto> {
  const res = await api.get<ApiResponse<SiteDto>>(`/api/masterdata/sites/${siteId}`);
  return unwrapAxiosApiData(res);
}

export async function fetchServices(): Promise<ServiceDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/services");
  return unwrapAxiosApiList<ServiceDto>(res);
}

export async function getServiceById(serviceId: number): Promise<ServiceDto> {
  const res = await api.get<ApiResponse<ServiceDto>>(`/api/masterdata/services/${serviceId}`);
  return unwrapAxiosApiData(res);
}

export async function fetchProviders(): Promise<ProviderDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/providers");
  return unwrapAxiosApiList<ProviderDto>(res);
}

export async function getProviderById(providerId: number): Promise<ProviderDto> {
  const res = await api.get<ApiResponse<ProviderDto>>(`/api/masterdata/providers/${providerId}`);
  return unwrapAxiosApiData(res);
}

export async function fetchRooms(params?: RoomSearchParams): Promise<RoomDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/masterdata/rooms", { params });
  return unwrapAxiosApiList<RoomDto>(res);
}

export async function getRoomById(roomId: number): Promise<RoomDto> {
  const res = await api.get<ApiResponse<RoomDto>>(`/api/masterdata/rooms/${roomId}`);
  return unwrapAxiosApiData(res);
}

export async function fetchServicesByProvider(providerId: number): Promise<ProviderServiceMappingDto[]> {
  const res = await api.get<ApiResponse<unknown>>(
    `/api/masterdata/providers/${providerId}/services`
  );
  return unwrapAxiosApiList<ProviderServiceMappingDto>(res);
}

export interface SiteCreatePayload {
  name: string;
  addressJson?: string;
  timezone?: string;
}

export interface SiteUpdatePayload {
  name?: string;
  addressJson?: string;
  timezone?: string;
}

export interface ServiceCreatePayload {
  name: string;
  visitType: string;
  defaultDurationMin?: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
}

export interface ServiceUpdatePayload {
  name?: string;
  visitType?: string;
  defaultDurationMin?: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
}

export interface ProviderCreatePayload {
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  credentials?: string;
  contactInfo?: string;
}

export interface ProviderUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  credentials?: string;
  contactInfo?: string;
}

export interface RoomCreatePayload {
  roomName: string;
  roomType?: string;
  siteId: number;
  attributesJson?: string;
}

export interface RoomUpdatePayload {
  roomName?: string;
  roomType?: string;
  siteId?: number;
  attributesJson?: string;
}

export async function createSite(payload: SiteCreatePayload): Promise<SiteDto> {
  const res = await api.post<ApiResponse<SiteDto>>("/api/masterdata/sites", payload);
  return unwrapAxiosApiData(res);
}

export async function updateSite(siteId: number, payload: SiteUpdatePayload): Promise<SiteDto> {
  const res = await api.put<ApiResponse<SiteDto>>(`/api/masterdata/sites/${siteId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateSite(siteId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/masterdata/sites/${siteId}`);
  unwrapAxiosApiData(res);
}

export async function activateSite(siteId: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/masterdata/sites/${siteId}/activate`);
  unwrapAxiosApiData(res);
}

export async function createService(payload: ServiceCreatePayload): Promise<ServiceDto> {
  const res = await api.post<ApiResponse<ServiceDto>>("/api/masterdata/services", payload);
  return unwrapAxiosApiData(res);
}

export async function updateService(serviceId: number, payload: ServiceUpdatePayload): Promise<ServiceDto> {
  const res = await api.put<ApiResponse<ServiceDto>>(`/api/masterdata/services/${serviceId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateService(serviceId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/masterdata/services/${serviceId}`);
  unwrapAxiosApiData(res);
}

export async function activateService(serviceId: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/masterdata/services/${serviceId}/activate`);
  unwrapAxiosApiData(res);
}

export async function createProvider(payload: ProviderCreatePayload): Promise<ProviderDto> {
  const res = await api.post<ApiResponse<ProviderDto>>("/api/masterdata/providers", payload);
  return unwrapAxiosApiData(res);
}

export async function updateProvider(providerId: number, payload: ProviderUpdatePayload): Promise<ProviderDto> {
  const res = await api.put<ApiResponse<ProviderDto>>(`/api/masterdata/providers/${providerId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateProvider(providerId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/masterdata/providers/${providerId}`);
  unwrapAxiosApiData(res);
}

export async function activateProvider(providerId: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/masterdata/providers/${providerId}/activate`);
  unwrapAxiosApiData(res);
}

export async function createRoom(payload: RoomCreatePayload): Promise<RoomDto> {
  const res = await api.post<ApiResponse<RoomDto>>("/api/masterdata/rooms", payload);
  return unwrapAxiosApiData(res);
}

export async function updateRoom(roomId: number, payload: RoomUpdatePayload): Promise<RoomDto> {
  const res = await api.put<ApiResponse<RoomDto>>(`/api/masterdata/rooms/${roomId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateRoom(roomId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/masterdata/rooms/${roomId}`);
  unwrapAxiosApiData(res);
}

export async function activateRoom(roomId: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/masterdata/rooms/${roomId}/activate`);
  unwrapAxiosApiData(res);
}

export interface ProviderServiceMappingDto {
  psid: number;
  providerId: number;
  providerName: string;
  serviceId: number;
  serviceName: string;
  customDurationMin: number | null;
  customBufferBeforeMin: number | null;
  customBufferAfterMin: number | null;
  status: string;
}

export async function fetchProvidersByService(serviceId: number): Promise<ProviderServiceMappingDto[]> {
  const res = await api.get<ApiResponse<unknown>>(`/api/masterdata/services/${serviceId}/providers`);
  return unwrapAxiosApiList<ProviderServiceMappingDto>(res);
}

export async function assignServiceToProvider(payload: {
  providerId: number;
  serviceId: number;
  customDurationMin?: number;
  customBufferBeforeMin?: number;
  customBufferAfterMin?: number;
}): Promise<ProviderServiceMappingDto> {
  const res = await api.post<ApiResponse<ProviderServiceMappingDto>>(
    "/api/masterdata/provider-services",
    payload
  );
  return unwrapAxiosApiData(res);
}

export async function removeServiceFromProvider(psid: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/masterdata/provider-services/${psid}`);
  unwrapAxiosApiData(res);
}
