import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchServices, fetchSites } from "../../../api/masterdataApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  service: string;
  time: string;
  site: string;
  status: string;
  date: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function ProviderDashboard() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, services, sites] = await Promise.all([
          meApi(),
          fetchServices(),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (cancelled) return;
        if (!me.providerId) {
          setAppointments([]);
          return;
        }
        const list = await searchAppointments({ providerId: me.providerId });
        if (cancelled) return;
        setAppointments(list);
        setPatientNames(new Map());
        setSiteNames(new Map(sites.map((s) => [s.siteId, s.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
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
    patientName: patientNames.get(apt.patientId) ?? "Unknown Patient",
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    time: to12Hour(apt.startTime),
    site: siteNames.get(apt.siteId) ?? "Unknown Site",
    status: apt.status,
    date: apt.slotDate,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = myAppointments.filter((apt) => apt.date === today);
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const counts = new Map<number, number>();
    for (const a of appointments) {
      const d = new Date(`${a.slotDate}T00:00:00`);
      const key = d.getTime();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return {
        day: weekLabels[d.getDay()],
        appointments: counts.get(d.getTime()) ?? 0,
      };
    });
  })();
  const averageDuration = (() => {
    if (!appointments.length) return 0;
    const total = appointments.reduce((sum, a) => {
      const [sh, sm] = a.startTime.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);
      const mins = Math.max(0, eh * 60 + em - (sh * 60 + sm));
      return sum + mins;
    }, 0);
    return Math.round(total / appointments.length);
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your schedule and appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          color="bg-[#7ba3c0]/20"
          subtitle="Scheduled for today"
        />
        <StatCard
          title="Completed This Week"
          value={myAppointments.filter(a => a.status === "Completed").length}
          icon={CheckCircle}
          color="bg-[#a9d4b8]/20"
          subtitle="All sites"
        />
        <StatCard
          title="Pending Check-ins"
          value={todayAppointments.filter(a => a.status === "Booked").length}
          icon={Users}
          color="bg-[#e8c9a9]/20"
          subtitle="Waiting patients"
        />
        <StatCard
          title="Average Duration"
          value={`${averageDuration || 0} min`}
          icon={Clock}
          color="bg-[#c4b5e8]/20"
          subtitle="Per appointment"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Weekly Schedule Overview</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis tick={{ fontSize: 11, fill: "#736e68" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ebe6df",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="appointments" fill="#7ba3c0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-[#7ba3c0]/10 hover:bg-[#7ba3c0]/20 transition-colors">
              <p className="text-sm font-medium text-foreground">View My Schedule</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check upcoming appointments</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-[#c4b5e8]/10 hover:bg-[#c4b5e8]/20 transition-colors">
              <p className="text-sm font-medium text-foreground">Set Availability</p>
              <p className="text-xs text-muted-foreground mt-0.5">Manage working hours</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-[#e8c9a9]/10 hover:bg-[#e8c9a9]/20 transition-colors">
              <p className="text-sm font-medium text-foreground">Request Leave</p>
              <p className="text-xs text-muted-foreground mt-0.5">Submit time-off request</p>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-medium text-foreground">Today's Appointments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monday, March 30, 2026</p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.service}</p>
                    <p className="text-xs text-muted-foreground mt-1">{apt.time} • {apt.site}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-md text-xs ${
                      apt.status === "CheckedIn"
                        ? "bg-[#a9d4b8]/30 text-foreground"
                        : "bg-[#7ba3c0]/30 text-foreground"
                    }`}
                  >
                    {apt.status}
                  </span>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
