import type { AxiosResponse } from "axios";

/** Mirrors backend ApiResponse of T (camelCase JSON). */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  error?: unknown;
  timestamp?: string;
}

export class ApiBusinessError extends Error {
  constructor(
    message: string,
    public readonly apiError?: unknown
  ) {
    super(message);
    this.name = "ApiBusinessError";
  }
}

/**
 * Returns payload data for a successful API envelope.
 * @throws ApiBusinessError when success is false or data is undefined
 */
export function unwrapApiData<T>(body: ApiResponse<T>): T {
  if (!body.success) {
    throw new ApiBusinessError(body.message ?? "Request failed", body.error);
  }
  if (body.data === undefined) {
    throw new ApiBusinessError(body.message ?? "No data in response", body.error);
  }
  return body.data;
}

/**
 * Same as unwrapApiData but allows null data when the API returns success with no object.
 */
export function unwrapApiDataAllowNull<T>(body: ApiResponse<T | null | undefined>): T | null {
  if (!body.success) {
    throw new ApiBusinessError(body.message ?? "Request failed", body.error);
  }
  if (body.data === undefined) {
    throw new ApiBusinessError(body.message ?? "No data in response", body.error);
  }
  return body.data ?? null;
}

/** Convenience for axios responses whose body is ApiResponse of T. */
export function unwrapAxiosApiData<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return unwrapApiData(res.data);
}

export function unwrapAxiosApiDataAllowNull<T>(
  res: AxiosResponse<ApiResponse<T | null | undefined>>
): T | null {
  return unwrapApiDataAllowNull(res.data);
}

/**
 * Unwraps ApiResponse and ensures `data` is a JSON array (backend list endpoints).
 * Aligns with axios `response.data` = envelope, `response.data.data` = payload.
 */
export function unwrapAxiosApiList<T>(res: AxiosResponse<ApiResponse<unknown>>): T[] {
  const data = unwrapApiData(res.data);
  if (!Array.isArray(data)) {
    throw new ApiBusinessError("API response data was not a JSON array.");
  }
  return data as T[];
}
