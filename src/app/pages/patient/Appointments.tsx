import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import {
  cancelAppointment,
  getAppointmentById,
  rescheduleAppointment,
  searchAppointments,
  type AppointmentDto,
} from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices, fetchSites } from "../../../api/masterdataApi";
import { searchOpenSlots } from "../../../api/slotsApi";

type AppointmentRow = {
  id: number;
  service: string;
  provider: string;
  status: string;
  date: string;
  time: string;
  site: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());
  const [patientId, setPatientId] = useState<number | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AppointmentDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, providers, services, sites] = await Promise.all([
          meApi(),
          fetchProviders(),
          fetchServices(),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (cancelled) return;
        setPatientId(me.userId);
        const list = await searchAppointments({ patientId: me.userId });
        if (cancelled) return;
        setAppointments(list);
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        setSiteNames(new Map(sites.map((s) => [s.siteId, s.name])));
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    status: apt.status,
    date: apt.slotDate,
    time: to12Hour(apt.startTime),
    site: siteNames.get(apt.siteId) ?? "Unknown Site",
  }));

  const handleCancel = async (appointmentId: number) => {
    try {
      await cancelAppointment(appointmentId, { reason: "Cancelled by patient" });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
      }
    } catch {
      // keep UI unchanged; no toast yet
    }
  };

  const handleReschedule = async (appointment: AppointmentDto) => {
    try {
      const date = new Date(`${appointment.slotDate}T00:00:00`);
      date.setDate(date.getDate() + 1);
      const nextDate = date.toISOString().slice(0, 10);
      const slots = await searchOpenSlots({
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
        siteId: appointment.siteId,
        date: nextDate,
      });
      const firstOpen = slots.find((s) => s.status.toLowerCase() === "open");
      if (!firstOpen) return;
      await rescheduleAppointment(appointment.appointmentId, {
        newPublishedSlotId: firstOpen.pubSlotId,
        reason: "Rescheduled by patient",
      });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
      }
    } catch {
      // keep UI unchanged
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your appointments</p>
      </div>

      <div className="space-y-4">
        {myAppointments.map((apt) => (
          <div key={apt.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-base font-medium text-foreground">{apt.service}</p>
                <p className="text-sm text-muted-foreground mt-1">with {apt.provider}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                apt.status === "Booked" ? "bg-[#7ba3c0]/30 text-foreground" :
                apt.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" :
                "bg-[#e8c9a9]/30 text-foreground"
              }`}>
                {apt.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{apt.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{apt.time}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{apt.site}</p>
            {apt.status === "Booked" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const apt = appointments.find((a) => a.appointmentId === apt.id);
                    if (apt) void handleReschedule(apt);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleCancel(apt.id)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => setSelectedDetails(await getAppointmentById(apt.id))}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  View
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedDetails && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Appointment Details</h3>
            <p className="text-sm text-muted-foreground">ID: {selectedDetails.appointmentId}</p>
            <p className="text-sm text-muted-foreground">Date: {selectedDetails.slotDate}</p>
            <p className="text-sm text-muted-foreground">Time: {selectedDetails.startTime}-{selectedDetails.endTime}</p>
            <p className="text-sm text-muted-foreground">Status: {selectedDetails.status}</p>
            <button
              onClick={() => setSelectedDetails(null)}
              className="mt-4 w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
