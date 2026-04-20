import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface OpsReportDto {
  reportId: number;
  scope: string;
  metricsJson: string | null;
  generatedDate: string;
}

export interface ReportSearchParams {
  scope?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateReportPayload {
  scope: string;
  metricsJson?: string;
}

export async function searchReports(params?: ReportSearchParams): Promise<OpsReportDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/reports", { params });
  return unwrapAxiosApiList<OpsReportDto>(res);
}

export async function getReportById(reportId: number): Promise<OpsReportDto> {
  const res = await api.get<ApiResponse<OpsReportDto>>(`/reports/${reportId}`);
  return unwrapAxiosApiData(res);
}

export async function createReport(payload: CreateReportPayload): Promise<OpsReportDto> {
  const res = await api.post<ApiResponse<OpsReportDto>>("/reports", payload);
  return unwrapAxiosApiData(res);
}

export async function exportReports(params?: ReportSearchParams): Promise<Blob> {
  const res = await api.get("/reports/export", { params, responseType: "blob" });
  return res.data as Blob;
}
