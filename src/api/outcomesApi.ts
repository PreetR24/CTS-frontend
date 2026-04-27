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
  hasPrescription?: boolean;
  prescriptionFileName?: string | null;
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

export async function uploadOutcomePrescription(appointmentId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<ApiResponse<object>>(`/outcome/${appointmentId}/prescription`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  unwrapAxiosApiData(res);
}

export async function downloadOutcomePrescription(appointmentId: number): Promise<{ blob: Blob; fileName: string }> {
  const res = await api.get(`/outcome/${appointmentId}/prescription`, { responseType: "blob" });
  const disposition = String(res.headers["content-disposition"] ?? "");
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return { blob: res.data as Blob, fileName: match?.[1] ?? `prescription-${appointmentId}` };
}
