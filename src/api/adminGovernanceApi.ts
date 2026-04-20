import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface BlackoutDto {
  blackoutId: number;
  siteId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
}

export interface CapacityRuleDto {
  ruleId: number;
  scope: string;
  scopeId: number | null;
  maxApptsPerDay: number | null;
  maxConcurrentRooms: number | null;
  bufferMin: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
}

export interface SlaDto {
  slaId: number;
  scope: string;
  metric: string;
  targetValue: number;
  unit: string;
  status: string;
}

export interface AuditLogDto {
  auditId: number;
  userId: number | null;
  action: string;
  resource: string;
  timestamp: string;
  metadata: string | null;
}

export async function searchBlackouts(siteId: number): Promise<BlackoutDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/blackouts", { params: { siteId } });
  return unwrapAxiosApiList<BlackoutDto>(res);
}

export async function createBlackout(payload: {
  siteId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<BlackoutDto> {
  const res = await api.post<ApiResponse<BlackoutDto>>("/blackouts", payload);
  return unwrapAxiosApiData(res);
}

export async function cancelBlackout(blackoutId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/blackouts/${blackoutId}`);
  unwrapAxiosApiData(res);
}

export async function searchCapacityRules(scope?: string, status?: string): Promise<CapacityRuleDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/capacity-rules", { params: { scope, status } });
  return unwrapAxiosApiList<CapacityRuleDto>(res);
}

export async function createCapacityRule(payload: {
  scope: string;
  scopeId?: number;
  maxApptsPerDay?: number;
  maxConcurrentRooms?: number;
  bufferMin: number;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<CapacityRuleDto> {
  const res = await api.post<ApiResponse<CapacityRuleDto>>("/capacity-rules", payload);
  return unwrapAxiosApiData(res);
}

export async function getCapacityRuleById(ruleId: number): Promise<CapacityRuleDto> {
  const res = await api.get<ApiResponse<CapacityRuleDto>>(`/capacity-rules/${ruleId}`);
  return unwrapAxiosApiData(res);
}

export async function updateCapacityRule(
  ruleId: number,
  payload: Partial<{
    scope: string;
    scopeId: number;
    maxApptsPerDay: number;
    maxConcurrentRooms: number;
    bufferMin: number;
    effectiveFrom: string;
    effectiveTo: string;
    status: string;
  }>
): Promise<CapacityRuleDto> {
  const res = await api.put<ApiResponse<CapacityRuleDto>>(`/capacity-rules/${ruleId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deleteCapacityRule(ruleId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/capacity-rules/${ruleId}`);
  unwrapAxiosApiData(res);
}

export async function searchSlas(scope?: string, status?: string): Promise<SlaDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/sla", { params: { scope, status } });
  return unwrapAxiosApiList<SlaDto>(res);
}

export async function createSla(payload: {
  scope: string;
  metric: string;
  targetValue: number;
  unit: string;
}): Promise<SlaDto> {
  const res = await api.post<ApiResponse<SlaDto>>("/sla", payload);
  return unwrapAxiosApiData(res);
}

export async function getSlaById(slaId: number): Promise<SlaDto> {
  const res = await api.get<ApiResponse<SlaDto>>(`/sla/${slaId}`);
  return unwrapAxiosApiData(res);
}

export async function updateSla(
  slaId: number,
  payload: Partial<{
    scope: string;
    metric: string;
    targetValue: number;
    unit: string;
    status: string;
  }>
): Promise<SlaDto> {
  const res = await api.put<ApiResponse<SlaDto>>(`/sla/${slaId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deleteSla(slaId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/sla/${slaId}`);
  unwrapAxiosApiData(res);
}

export async function searchAuditLogs(params?: {
  userId?: number;
  action?: string;
  resource?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditLogDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/iam/auditlogs", { params });
  return unwrapAxiosApiList<AuditLogDto>(res);
}

export async function createAuditLog(payload: {
  userId?: number;
  action: string;
  resource: string;
  metadata?: string;
}): Promise<AuditLogDto> {
  const res = await api.post<ApiResponse<AuditLogDto>>("/api/iam/auditlogs", payload);
  return unwrapAxiosApiData(res);
}

export async function getAuditLogById(id: number): Promise<AuditLogDto> {
  const res = await api.get<ApiResponse<AuditLogDto>>(`/api/iam/auditlogs/${id}`);
  return unwrapAxiosApiData(res);
}
