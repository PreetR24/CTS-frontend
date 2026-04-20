import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData } from "./apiTypes";

export async function signupPatient(payload: {
  name: string;
  email: string;
  phone?: string;
}): Promise<void> {
  const res = await api.post<ApiResponse<object>>("/auth/signup/patient", payload);
  unwrapAxiosApiData(res);
}
