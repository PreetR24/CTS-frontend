import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Calendar, Clock, Bell } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { useNavigate } from "react-router-dom";
import { fetchUnreadNotificationCount } from "../../../api/notificationsApi";

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
  const [unreadReminderCount, setUnreadReminderCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (cancelled) return;
        const [list, unread] = await Promise.all([
          searchAppointments({ patientId: me.userId }),
          fetchUnreadNotificationCount().catch(() => 0),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setUnreadReminderCount(unread);
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
    service: apt.serviceName?.trim() || `Service ${apt.serviceId}`,
    provider: apt.providerName?.trim() || `Doctor ${apt.providerId}`,
    status: apt.status,
    date: apt.slotDate,
    time: to12Hour(apt.startTime),
    site: apt.siteName?.trim() || `Site ${apt.siteId}`,
  }));
  const upcomingAppointments = myAppointments.filter(
    (apt) => apt.status === "Booked" || apt.status === "CheckedIn"
  );
  const nextAppointment = [...upcomingAppointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your health overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Upcoming Appointments" value={upcomingAppointments.length} icon={Calendar} color="bg-[#e8b5d4]/40" subtitle="This month" />
        <StatCard
          title="Next Appointment"
          value={nextAppointment ? nextAppointment.date : "—"}
          icon={Clock}
          color="bg-[#7ba3c0]/20"
          subtitle={nextAppointment ? `${nextAppointment.time}` : "No upcoming"}
        />
        <StatCard
          title="Total Appointments"
          value={appointments.length}
          icon={Calendar}
          color="bg-[#c4b5e8]/20"
          subtitle="From your history"
        />
        <StatCard title="Reminders" value={unreadReminderCount} icon={Bell} color="bg-[#e8c9a9]/30" subtitle="Unread notifications" />
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
                <p className="text-xs text-foreground/80">{apt.date} at <span className="font-semibold text-foreground">{apt.time}</span> • {apt.site}</p>
              </div>
            ))}
            {myAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground">No appointments found.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => navigate("/patient/appointments")} className="w-full text-left px-3 py-2.5 rounded-lg bg-[#e8b8d4]/20 hover:bg-[#e8b8d4]/30 transition-colors">
                <p className="text-sm font-medium text-foreground">New Appointment</p>
              </button>
              <button onClick={() => navigate("/patient/doctors")} className="w-full text-left px-3 py-2.5 rounded-lg bg-[#e8b8d4]/20 hover:bg-[#e8b8d4]/30 transition-colors">
                <p className="text-sm font-medium text-foreground">View Doctors & Slots</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}