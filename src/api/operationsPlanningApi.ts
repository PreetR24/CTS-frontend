import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface LeaveImpactDto {
  impactId: number;
  leaveId: number;
  impactType: string;
  impactJson: string | null;
  resolvedBy: number | null;
  resolvedDate: string | null;
  status: string;
}

export interface ShiftTemplateDto {
  shiftTemplateId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  role: string;
  siteId: number;
  status: string;
}

export async function searchLeaveImpactsByLeaveId(leaveId: number): Promise<LeaveImpactDto[]> {
  const res = await api.get<ApiResponse<unknown>>(`/leave-impact/leave/${leaveId}`);
  return unwrapAxiosApiList<LeaveImpactDto>(res);
}

export async function getLeaveImpactById(impactId: number): Promise<LeaveImpactDto> {
  const res = await api.get<ApiResponse<LeaveImpactDto>>(`/leave-impact/${impactId}`);
  return unwrapAxiosApiData(res);
}

export async function createLeaveImpact(payload: {
  leaveId: number;
  impactType: string;
  impactJson?: string;
}): Promise<LeaveImpactDto> {
  const res = await api.post<ApiResponse<LeaveImpactDto>>("/leave-impact", payload);
  return unwrapAxiosApiData(res);
}

export async function resolveLeaveImpact(impactId: number, resolvedBy: number): Promise<LeaveImpactDto> {
  const res = await api.patch<ApiResponse<LeaveImpactDto>>(`/leave-impact/${impactId}/resolve`, {
    resolvedBy,
  });
  return unwrapAxiosApiData(res);
}

export async function searchShiftTemplates(params?: {
  siteId?: number;
  role?: string;
  status?: string;
}): Promise<ShiftTemplateDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/shift-templates", { params });
  return unwrapAxiosApiList<ShiftTemplateDto>(res);
}

export async function getShiftTemplateById(id: number): Promise<ShiftTemplateDto> {
  const res = await api.get<ApiResponse<ShiftTemplateDto>>(`/shift-templates/${id}`);
  return unwrapAxiosApiData(res);
}

export async function createShiftTemplate(payload: {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  role: string;
  siteId: number;
}): Promise<ShiftTemplateDto> {
  const res = await api.post<ApiResponse<ShiftTemplateDto>>("/shift-templates", payload);
  return unwrapAxiosApiData(res);
}

export async function updateShiftTemplate(
  id: number,
  payload: Partial<{
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    role: string;
    siteId: number;
    status: string;
  }>
): Promise<ShiftTemplateDto> {
  const res = await api.put<ApiResponse<ShiftTemplateDto>>(`/shift-templates/${id}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deleteShiftTemplate(id: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/shift-templates/${id}`);
  unwrapAxiosApiData(res);
}
