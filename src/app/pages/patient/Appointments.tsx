import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { cancelAppointment, searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices, fetchSites } from "../../../api/masterdataApi";

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

  const myAppointments = useMemo<AppointmentRow[]>(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        provider: providerNames.get(apt.providerId) ?? `Provider #${apt.providerId}`,
        status: apt.status,
        date: apt.slotDate,
        time: to12Hour(apt.startTime),
        site: siteNames.get(apt.siteId) ?? `Site #${apt.siteId}`,
      })),
    [appointments, providerNames, serviceNames, siteNames]
  );

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
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">Reschedule</button>
                <button
                  onClick={() => handleCancel(apt.id)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
