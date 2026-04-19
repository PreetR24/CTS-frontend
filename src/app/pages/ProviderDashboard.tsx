import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Calendar, Clock, Users, CheckCircle, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { searchAppointments, type AppointmentDto } from "../../api/appointmentsApi";
import { meApi } from "../../api/authApi";
import { fetchProviders, fetchServices, fetchSites } from "../../api/masterdataApi";
import { fetchUsers } from "../../api/usersApi";

export default function ProviderDashboard() {
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

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
        const meUser = users.find((u) => u.email.toLowerCase() === me.email.toLowerCase());
        if (!meUser?.providerId) return;
        const list = await searchAppointments({ providerId: meUser.providerId });
        if (cancelled) return;
        setAppointments(list);
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
        setSiteNames(new Map(sites.map((s) => [s.siteId, s.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        void providers;
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myAppointments = useMemo(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        patientName: patientNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        provider: "Self",
        date: apt.slotDate,
        time: apt.startTime,
        site: siteNames.get(apt.siteId) ?? `Site #${apt.siteId}`,
        status: apt.status,
      })),
    [appointments, patientNames, serviceNames, siteNames]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = myAppointments.filter((apt) => apt.date === today);

  const weeklyData = [
    { day: "Mon", appointments: 8 },
    { day: "Tue", appointments: 12 },
    { day: "Wed", appointments: 10 },
    { day: "Thu", appointments: 14 },
    { day: "Fri", appointments: 11 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header title="Provider Dashboard" userName="Dr. Rajesh Kumar" userRole="Cardiologist" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Appointments"
            value={todayAppointments.length}
            icon={Calendar}
            color="bg-[#a8c4d4]/20"
            subtitle="Scheduled for today"
          />
          <StatCard
            title="Completed This Week"
            value={myAppointments.filter(a => a.status === "Completed").length}
            icon={CheckCircle}
            color="bg-[#c4f0d4]/20"
            subtitle="All sites"
          />
          <StatCard
            title="Pending Check-ins"
            value={todayAppointments.filter(a => a.status === "Booked").length}
            icon={Users}
            color="bg-[#f5d4c4]/20"
            subtitle="Waiting patients"
          />
          <StatCard
            title="Average Duration"
            value="28 min"
            icon={Clock}
            color="bg-[#d4c4f0]/20"
            subtitle="Per appointment"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Weekly Schedule</h3>
              <button
                onClick={() => setShowAvailabilityModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary-foreground rounded-lg hover:bg-primary/30 transition-colors text-xs"
              >
                <Plus className="w-3 h-3" />
                Block Time
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d5c7" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8b7e74" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8b7e74" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0d5c7",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="appointments" fill="#a8c4d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-lg bg-[#a8c4d4]/10 hover:bg-[#a8c4d4]/20 transition-colors">
                <p className="text-sm font-medium text-foreground">View My Schedule</p>
                <p className="text-xs text-muted-foreground mt-0.5">Check upcoming appointments</p>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-[#d4c4f0]/10 hover:bg-[#d4c4f0]/20 transition-colors">
                <p className="text-sm font-medium text-foreground">Set Availability</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manage working hours</p>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-[#f5d4c4]/10 hover:bg-[#f5d4c4]/20 transition-colors">
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
                      <Calendar className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{apt.service}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{apt.time}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{apt.site}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-md text-xs ${
                        apt.status === "CheckedIn"
                          ? "bg-[#c4f0d4]/30 text-foreground"
                          : "bg-[#a8c4d4]/30 text-foreground"
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

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Block Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">End Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Reason</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>CME/Conference</option>
                  <option>Surgery/Procedure</option>
                  <option>Personal</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Block Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
