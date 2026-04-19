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

export interface RosterAssignmentDto {
  assignmentId: number;
  rosterId: number;
  userId: number;
  shiftTemplateId: number;
  date: string;
  role: string | null;
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

export async function searchLeaveRequests(params?: LeaveSearchParams): Promise<LeaveRequestDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/leave", { params });
  return unwrapAxiosApiList<LeaveRequestDto>(res);
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

export async function searchRosterAssignments(
  params?: RosterAssignmentSearchParams
): Promise<RosterAssignmentDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/roster-assignments", { params });
  return unwrapAxiosApiList<RosterAssignmentDto>(res);
}
