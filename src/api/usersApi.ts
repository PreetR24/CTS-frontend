import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface UserDto {
  userId: number;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: string;
}

export interface UserSearchParams {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchUsers(params?: UserSearchParams): Promise<UserDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/api/iam/users", { params });
  return unwrapAxiosApiList<UserDto>(res);
}

export interface UserCreatePayload {
  name: string;
  role: string;
  email: string;
  phone?: string;
  specialty?: string;
  credentials?: string;
}

export interface UserUpdatePayload {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  requesterRole?: string;
}

export async function getUserById(userId: number): Promise<UserDto> {
  const res = await api.get<ApiResponse<UserDto>>(`/api/iam/users/${userId}`);
  return unwrapAxiosApiData(res);
}

export async function createUser(payload: UserCreatePayload): Promise<UserDto> {
  const res = await api.post<ApiResponse<UserDto>>("/api/iam/users", payload);
  return unwrapAxiosApiData(res);
}

export async function updateUser(userId: number, payload: UserUpdatePayload): Promise<UserDto> {
  const res = await api.put<ApiResponse<UserDto>>(`/api/iam/users/${userId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function deactivateUser(userId: number): Promise<void> {
  const res = await api.delete<ApiResponse<object>>(`/api/iam/users/${userId}`);
  unwrapAxiosApiData(res);
}

export async function activateUser(userId: number): Promise<void> {
  const res = await api.post<ApiResponse<object>>(`/api/iam/users/${userId}/activate`);
  unwrapAxiosApiData(res);
}

