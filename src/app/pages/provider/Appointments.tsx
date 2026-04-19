import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices, fetchSites } from "../../../api/masterdataApi";
import { fetchUsers } from "../../../api/usersApi";

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
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [providerId, setProviderId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, users, providers, services, sites] = await Promise.all([
          meApi(),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
          fetchServices(),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);

        if (cancelled) return;

        const currentUser = users.find((u) => u.email.toLowerCase() === me.email.toLowerCase());
        const pid = currentUser?.providerId ?? null;
        setProviderId(pid);
        if (pid == null) {
          setAppointments([]);
          return;
        }

        const list = await searchAppointments({ providerId: pid });
        if (cancelled) return;
        setAppointments(list);

        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
        setSiteNames(new Map(sites.map((s) => [s.siteId, s.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        void providers;
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

  const myAppointments = useMemo<AppointmentRow[]>(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        patientName: patientNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        date: apt.slotDate,
        time: to12Hour(apt.startTime),
        site: siteNames.get(apt.siteId) ?? `Site #${apt.siteId}`,
        status: apt.status,
      })),
    [appointments, patientNames, serviceNames, siteNames]
  );

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
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
