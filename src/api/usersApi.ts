import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiList } from "./apiTypes";

export interface UserDto {
  userId: number;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: string;
  providerId: number | null;
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
