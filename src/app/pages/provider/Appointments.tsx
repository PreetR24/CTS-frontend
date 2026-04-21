import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import {
  getAppointmentById,
  markAppointmentCompleted,
  markAppointmentNoShow,
  searchAppointments,
  type AppointmentDto,
} from "../../../api/appointmentsApi";
import { createOutcome, markOutcomeNoShow } from "../../../api/outcomesApi";
import { meApi } from "../../../api/authApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  service: string;
  date: string;
  time: string;
  site: string;
  status: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function ProviderAppointments() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AppointmentDto | null>(null);
  const [outcomeAppointmentId, setOutcomeAppointmentId] = useState<number | null>(null);
  const [clinicalNotesInput, setClinicalNotesInput] = useState("");
  const [treatmentPlanInput, setTreatmentPlanInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();

        if (cancelled) return;

        const pid = me.userId ?? null;
        setProviderId(pid);
        if (pid == null) {
          setAppointments([]);
          return;
        }

        const list = await searchAppointments({ providerId: pid });
        if (cancelled) return;
        setAppointments(list);
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setProviderId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    patientName: apt.patientName?.trim() || `Patient ${apt.patientId}`,
    service: apt.serviceName?.trim() || `Service ${apt.serviceId}`,
    date: apt.slotDate,
    time: to12Hour(apt.startTime),
    site: apt.siteName?.trim() || `Site ${apt.siteId}`,
    status: apt.status,
  }));

  const openAppointmentDetails = async (appointmentId: number) => {
    const details = await getAppointmentById(appointmentId);
    setSelectedDetails(details);
  };

  const markCompleted = async (appointmentId: number) => {
    await markAppointmentCompleted(appointmentId);
    if (providerId != null) {
      const refreshed = await searchAppointments({ providerId });
      setAppointments(refreshed);
    }
  };

  const openOutcomeModal = (appointmentId: number) => {
    setOutcomeAppointmentId(appointmentId);
    setClinicalNotesInput("");
    setTreatmentPlanInput("");
  };

  const markNoShow = async (appointmentId: number) => {
    await markAppointmentNoShow(appointmentId);
    await markOutcomeNoShow(appointmentId, { reason: "Marked by provider" });
    if (providerId != null) {
      const refreshed = await searchAppointments({ providerId });
      setAppointments(refreshed);
    }
  };

  const closeDetailsModal = () => setSelectedDetails(null);
  const closeOutcomeModal = () => setOutcomeAppointmentId(null);

  const saveOutcomeFromModal = async () => {
    if (outcomeAppointmentId == null) return;
    if (!clinicalNotesInput.trim() && !treatmentPlanInput.trim()) return;
    await createOutcome(outcomeAppointmentId, {
      clinicalNotes: clinicalNotesInput.trim() || undefined,
      treatmentPlan: treatmentPlanInput.trim() || undefined,
    });
    setOutcomeAppointmentId(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">All your scheduled consultations</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Service</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {myAppointments.map((apt) => (
                <tr key={apt.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{apt.patientName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{apt.service}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{apt.date}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{apt.time}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{apt.site.split(" - ")[1] ?? apt.site}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                      apt.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" :
                      apt.status === "CheckedIn" ? "bg-[#7ba3c0]/30 text-foreground" :
                      "bg-[#e8c9a9]/30 text-foreground"
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => void openAppointmentDetails(apt.id)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                    >
                      View Details
                    </button>
                    {(apt.status === "Booked" || apt.status === "CheckedIn") && (
                      <button
                        onClick={() => void markCompleted(apt.id)}
                        className="ml-2 px-3 py-1.5 rounded-lg bg-[#95d4a8] text-white text-xs"
                      >
                        Complete
                      </button>
                    )}
                    {(apt.status === "Booked" || apt.status === "CheckedIn") && (
                      <button
                        onClick={() => openOutcomeModal(apt.id)}
                        className="ml-2 px-3 py-1.5 rounded-lg border border-border text-xs"
                      >
                        Add Outcome
                      </button>
                    )}
                    {apt.status === "Booked" && (
                      <button
                        onClick={() => void markNoShow(apt.id)}
                        className="ml-2 px-3 py-1.5 rounded-lg border border-border text-xs"
                      >
                        No-Show
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {myAppointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-sm text-muted-foreground text-center">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedDetails && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Appointment Details</h3>
            <p className="text-sm text-muted-foreground">ID: {selectedDetails.appointmentId}</p>
            <p className="text-sm text-muted-foreground">
              Patient: {selectedDetails.patientName?.trim() || `Patient ${selectedDetails.patientId}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Provider: {selectedDetails.providerName?.trim() || `Provider ${selectedDetails.providerId}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Service: {selectedDetails.serviceName?.trim() || `Service ${selectedDetails.serviceId}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Site: {selectedDetails.siteName?.trim() || `Site ${selectedDetails.siteId}`}
            </p>
            <p className="text-sm text-muted-foreground">Date: {selectedDetails.slotDate}</p>
            <p className="text-sm text-muted-foreground">Time: {selectedDetails.startTime}-{selectedDetails.endTime}</p>
            <p className="text-sm text-muted-foreground">Status: {selectedDetails.status}</p>
            <button
              onClick={closeDetailsModal}
              className="mt-4 w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {outcomeAppointmentId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Add Outcome</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Clinical Notes</label>
                <textarea
                  rows={3}
                  value={clinicalNotesInput}
                  onChange={(e) => setClinicalNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Treatment Plan</label>
                <textarea
                  rows={3}
                  value={treatmentPlanInput}
                  onChange={(e) => setTreatmentPlanInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeOutcomeModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button onClick={() => void saveOutcomeFromModal()} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
