import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { searchAppointments, searchWaitlist, type AppointmentDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  provider: string;
  service: string;
  time: string;
  status: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function FrontDeskDashboard() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [waitCount, setWaitCount] = useState(0);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [list, waitlist, users, providers, services] = await Promise.all([
          searchAppointments({ date: today }),
          searchWaitlist(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchProviders(),
          fetchServices(),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setWaitCount(waitlist.length);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setWaitCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    patientName: userNames.get(apt.patientId) ?? "Unknown Patient",
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    time: to12Hour(apt.startTime),
    status: apt.status,
  }));

  const checkedInCount = todayAppointments.filter(apt => apt.status === "CheckedIn").length;
  const pendingCheckin = todayAppointments.filter(apt => apt.status === "Booked").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Front Desk Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Today's appointments and queue management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          color="bg-[#e8c9a9]/40"
          subtitle="All providers"
        />
        <StatCard
          title="Checked In"
          value={checkedInCount}
          icon={Users}
          color="bg-[#a9d4b8]/30"
          subtitle="Currently in clinic"
        />
        <StatCard
          title="Pending Check-in"
          value={pendingCheckin}
          icon={Clock}
          color="bg-[#7ba3c0]/20"
          subtitle="Awaiting arrival"
        />
        <StatCard
          title="Waitlist"
          value={waitCount}
          icon={AlertCircle}
          color="bg-[#e8b8d4]/30"
          subtitle="Pending slots"
        />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-medium text-foreground">Today's Schedule</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monday, March 30, 2026</p>
        </div>
        <div className="p-5">
          <div className="space-y-2">
            {todayAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-primary-foreground bg-primary/20 px-2 py-1 rounded">{apt.time}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{apt.service} • {apt.provider}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs ${
                    apt.status === "CheckedIn" ? "bg-[#a9d4b8]/30 text-foreground" :
                    apt.status === "Completed" ? "bg-[#7ba3c0]/30 text-foreground" :
                    "bg-[#e8c9a9]/50 text-foreground"
                  }`}>
                    {apt.status}
                  </span>
                  {apt.status === "Booked" && (
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
