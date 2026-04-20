import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData } from "./apiTypes";

export interface OutcomeDto {
  outcomeId: number;
  appointmentId: number;
  clinicalNotes: string | null;
  diagnosisCodes: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
  status: string;
}

export async function createOutcome(
  appointmentId: number,
  payload: {
    clinicalNotes?: string;
    diagnosisCodes?: string;
    treatmentPlan?: string;
    followUpDate?: string;
  }
): Promise<OutcomeDto> {
  const res = await api.post<ApiResponse<OutcomeDto>>(`/outcome/${appointmentId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function markOutcomeNoShow(
  appointmentId: number,
  payload?: { reason?: string }
): Promise<OutcomeDto> {
  const res = await api.post<ApiResponse<OutcomeDto>>(`/outcome/${appointmentId}/no-show`, payload ?? {});
  return unwrapAxiosApiData(res);
}
