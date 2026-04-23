import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiDataAllowNull } from "./apiTypes";

export interface OutcomeDto {
  outcomeId: number;
  appointmentId: number;
  outcome: string;
  notes: string | null;
  markedBy: number | null;
  markedDate: string;
}

export async function createOutcome(
  appointmentId: number,
  payload: {
    outcome: string;
    notes?: string;
    markedBy?: number;
  }
): Promise<OutcomeDto> {
  const res = await api.post<ApiResponse<OutcomeDto>>(`/outcome/${appointmentId}`, payload);
  return unwrapAxiosApiData(res);
}

export async function getOutcomeByAppointment(appointmentId: number): Promise<OutcomeDto | null> {
  const res = await api.get<ApiResponse<OutcomeDto | null>>(`/outcome/${appointmentId}`);
  return unwrapAxiosApiDataAllowNull(res);
}
