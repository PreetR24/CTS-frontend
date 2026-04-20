import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Calendar, Clock, FileText, Bell } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
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

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());

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
  const upcomingAppointments = myAppointments.filter(
    (apt) => apt.status === "Booked" || apt.status === "CheckedIn"
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your health overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Upcoming Appointments" value={upcomingAppointments.length} icon={Calendar} color="bg-[#e8b5d4]/40" subtitle="This month" />
        <StatCard title="Next Appointment" value="Mar 30" icon={Clock} color="bg-[#7ba3c0]/20" subtitle="2026 at 10:00 AM" />
        <StatCard title="Medical Records" value="8" icon={FileText} color="bg-[#c4b5e8]/20" subtitle="Available documents" />
        <StatCard title="Reminders" value="2" icon={Bell} color="bg-[#e8c9a9]/30" subtitle="Pending actions" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">My Appointments</h3>
          <div className="space-y-3">
            {myAppointments.map((apt) => (
              <div key={apt.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{apt.service}</p>
                    <p className="text-xs text-muted-foreground mt-1">with {apt.provider}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-md text-xs ${
                    apt.status === "Booked" ? "bg-[#7ba3c0]/30 text-foreground" :
                    apt.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" :
                    "bg-[#e8c9a9]/30 text-foreground"
                  }`}>
                    {apt.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{apt.date} at {apt.time} • {apt.site}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {["Book Appointment", "View Records", "Prescription Refill", "Contact Support"].map((action, i) => (
                <button key={i} className="w-full text-left px-3 py-2.5 rounded-lg bg-[#e8b8d4]/20 hover:bg-[#e8b8d4]/30 transition-colors">
                  <p className="text-sm font-medium text-foreground">{action}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}