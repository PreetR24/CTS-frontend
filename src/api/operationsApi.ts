import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface RosterDto {
  rosterId: number;
  siteId: number;
  department: string | null;
  periodStart: string;
  periodEnd: string;
  publishedBy: number | null;
  publishedDate: string | null;
  status: string;
}

export interface RosterSearchParams {
  siteId?: number;
  status?: string;
}

export interface LeaveRequestDto {
  leaveId: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  submittedDate: string;
  status: string;
}

export interface LeaveSearchParams {
  userId?: number;
  status?: string;
}

export interface CreateLeaveRequestPayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface OnCallDto {
  onCallId: number;
  siteId: number;
  department: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startDateTimeUtc: string;
  endDateTimeUtc: string;
  primaryUserId: number;
  backupUserId: number | null;
  status: string;
}

export interface OnCallSearchParams {
  siteId?: number;
  date?: string;
}

export interface CreateOnCallPayload {
  siteId: number;
  department?: string;
  date: string;
  startTime: string;
  endTime: string;
  primaryUserId: number;
  backupUserId?: number;
}

export interface RosterAssignmentDto {
  assignmentId: number;
  rosterId: number;
  userId: number;
  shiftTemplateId: number;
  date: string;
  role: string | null;
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

export interface RosterAssignmentSearchParams {
  siteId?: number;
  userId?: number;
  date?: string;
  status?: string;
}

export async function searchRosters(params?: RosterSearchParams): Promise<RosterDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/rosters", { params });
  return unwrapAxiosApiList<RosterDto>(res);
}

export async function getRosterById(rosterId: number): Promise<RosterDto> {
  const res = await api.get<ApiResponse<RosterDto>>(`/rosters/${rosterId}`);
  return unwrapAxiosApiData(res);
}

export async function createRoster(payload: {
  siteId: number;
  department?: string;
  periodStart: string;
  periodEnd: string;
}): Promise<RosterDto> {
  const res = await api.post<ApiResponse<RosterDto>>("/rosters", payload);
  return unwrapAxiosApiData(res);
}

export async function updateRoster(
  rosterId: number,
  payload: {
    siteId?: number;
    department?: string;
    periodStart?: string;
    periodEnd?: string;
    status?: string;
  }
): Promise<RosterDto> {
  const res = await api.put<ApiResponse<RosterDto>>(`/rosters/${rosterId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deleteRoster(rosterId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/rosters/${rosterId}`);
  unwrapAxiosApiData(res);
}

export async function publishRoster(rosterId: number, publishedBy?: number): Promise<RosterDto> {
  const res = await api.patch<ApiResponse<RosterDto>>(`/rosters/${rosterId}/publish`, { publishedBy });
  return unwrapAxiosApiData(res);
}

export async function searchLeaveRequests(params?: LeaveSearchParams): Promise<LeaveRequestDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/leave", { params });
  return unwrapAxiosApiList<LeaveRequestDto>(res);
}

export async function getLeaveRequestById(leaveId: number): Promise<LeaveRequestDto> {
  const res = await api.get<ApiResponse<LeaveRequestDto>>(`/leave/${leaveId}`);
  return unwrapAxiosApiData(res);
}

export interface LeaveImpactSummaryDto {
  impactId: number;
  leaveId: number;
  impactType: string;
  impactJson: string | null;
  resolvedBy: number | null;
  resolvedDate: string | null;
  status: string;
}

export async function getLeaveImpacts(leaveId: number): Promise<LeaveImpactSummaryDto[]> {
  const res = await api.get<ApiResponse<unknown>>(`/leave/${leaveId}/impacts`);
  return unwrapAxiosApiList<LeaveImpactSummaryDto>(res);
}

export async function submitLeaveRequest(
  payload: CreateLeaveRequestPayload
): Promise<LeaveRequestDto> {
  const res = await api.post<ApiResponse<LeaveRequestDto>>("/leave", payload);
  return unwrapAxiosApiData(res);
}

export async function cancelLeave(leaveId: number): Promise<LeaveRequestDto> {
  const res = await api.patch<ApiResponse<LeaveRequestDto>>(`/leave/${leaveId}/cancel`);
  return unwrapAxiosApiData(res);
}

export async function approveLeave(leaveId: number): Promise<LeaveRequestDto> {
  const res = await api.patch<ApiResponse<LeaveRequestDto>>(`/leave/${leaveId}/approve`);
  return unwrapAxiosApiData(res);
}

export async function rejectLeave(leaveId: number): Promise<LeaveRequestDto> {
  const res = await api.patch<ApiResponse<LeaveRequestDto>>(`/leave/${leaveId}/reject`);
  return unwrapAxiosApiData(res);
}

export async function searchOnCall(params?: OnCallSearchParams): Promise<OnCallDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/oncall", { params });
  return unwrapAxiosApiList<OnCallDto>(res);
}

export async function getOnCallById(onCallId: number): Promise<OnCallDto> {
  const res = await api.get<ApiResponse<OnCallDto>>(`/oncall/${onCallId}`);
  return unwrapAxiosApiData(res);
}

export async function createOnCall(payload: CreateOnCallPayload): Promise<OnCallDto> {
  const res = await api.post<ApiResponse<OnCallDto>>("/oncall", payload);
  return unwrapAxiosApiData(res);
}

export async function updateOnCall(
  onCallId: number,
  payload: Partial<CreateOnCallPayload> & { status?: string }
): Promise<OnCallDto> {
  const res = await api.put<ApiResponse<OnCallDto>>(`/oncall/${onCallId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function searchRosterAssignments(
  params?: RosterAssignmentSearchParams
): Promise<RosterAssignmentDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/roster-assignments", { params });
  return unwrapAxiosApiList<RosterAssignmentDto>(res);
}

export async function createRosterAssignment(payload: {
  rosterId: number;
  userId: number;
  shiftTemplateId: number;
  date: string;
  role?: string;
}): Promise<RosterAssignmentDto> {
  const res = await api.post<ApiResponse<RosterAssignmentDto>>("/roster-assignments", payload);
  return unwrapAxiosApiData(res);
}

export async function swapRosterAssignment(
  assignmentId: number,
  payload: { newUserId: number; reason?: string }
): Promise<RosterAssignmentDto> {
  const res = await api.patch<ApiResponse<RosterAssignmentDto>>(
    `/roster-assignments/${assignmentId}/swap`,
    payload
  );
  return unwrapAxiosApiData(res);
}

export async function markRosterAssignmentAbsent(
  assignmentId: number,
  payload?: { reason?: string }
): Promise<RosterAssignmentDto> {
  const res = await api.patch<ApiResponse<RosterAssignmentDto>>(
    `/roster-assignments/${assignmentId}/absent`,
    payload ?? {}
  );
  return unwrapAxiosApiData(res);
}

export async function getShiftTemplateById(shiftTemplateId: number): Promise<ShiftTemplateDto> {
  const res = await api.get<ApiResponse<ShiftTemplateDto>>(`/shift-templates/${shiftTemplateId}`);
  return unwrapAxiosApiData(res);
}
