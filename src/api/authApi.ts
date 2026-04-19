import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiDataAllowNull } from "./apiTypes";

export interface MeResponse {
  userId: number;
  name: string;
  role: string;
  email: string;
  landingPage: string;
}

export const logoutApi = async (): Promise<void> => {
  const res = await api.post<ApiResponse<object | null>>("/auth/logout");
  unwrapAxiosApiDataAllowNull(res);
};

export const meApi = async (): Promise<MeResponse> => {
  const res = await api.get<ApiResponse<MeResponse>>("/auth/me");
  return unwrapAxiosApiData(res);
};

export interface LoginPayload {
  email: string;
  role: string;
}

/** Inner payload from LoginResponseDto (camelCase). */
export interface LoginResultDto {
  userId: number;
  name: string;
  role: string;
  email: string;
  status: string;
  providerId: number | null;
  token: string;
}

export type LoginResponse = ApiResponse<LoginResultDto>;

export const loginApi = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data;
};