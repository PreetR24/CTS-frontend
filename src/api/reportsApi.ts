import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiList } from "./apiTypes";

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

export async function searchReports(params?: ReportSearchParams): Promise<OpsReportDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/reports", { params });
  return unwrapAxiosApiList<OpsReportDto>(res);
}
