import { useEffect, useMemo, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { searchOnCall, searchRosterAssignments } from "../../../api/operationsApi";
import { fetchUsers } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  provider: string;
  service: string;
  time: string;
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

export default function StaffDashboard() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [myShiftCount, setMyShiftCount] = useState(0);
  const [todayShiftLabel, setTodayShiftLabel] = useState("—");
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [me, users, providers, services, list, assignments, onCalls] = await Promise.all([
          meApi(),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
          fetchServices(),
          searchAppointments({ date: today }),
          searchRosterAssignments(),
          searchOnCall({ date: today }),
        ]);
        if (cancelled) return;
        const meUser = users.find((u) => u.email.toLowerCase() === me.email.toLowerCase());
        const uid = meUser?.userId ?? me.userId;

        const ownAssignments = assignments.filter((a) => a.userId === uid);
        const ownOnCalls = onCalls.filter((o) => o.primaryUserId === uid || o.backupUserId === uid);
        setMyShiftCount(ownAssignments.length + ownOnCalls.length);
        if (ownOnCalls[0]) {
          setTodayShiftLabel(`${ownOnCalls[0].startTime}-${ownOnCalls[0].endTime}`);
        } else if (ownAssignments[0]) {
          setTodayShiftLabel("Assigned Shift");
        }

        setAppointments(list);
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setMyShiftCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments = useMemo<AppointmentRow[]>(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        patientName: patientNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        provider: providerNames.get(apt.providerId) ?? `Provider #${apt.providerId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        time: to12Hour(apt.startTime),
        status: apt.status,
        date: apt.slotDate,
      })),
    [appointments, patientNames, providerNames, serviceNames]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Staff Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your shift and tasks overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Shift" value={todayShiftLabel} icon={Clock} color="bg-[#a9d4b8]/30" subtitle="Current assignment" />
        <StatCard title="Total Patients" value={todayAppointments.length} icon={Users} color="bg-[#7ba3c0]/20" subtitle="Scheduled today" />
        <StatCard title="Completed" value={todayAppointments.filter(a => a.status === "Completed").length} icon={CheckCircle} color="bg-[#e8c9a9]/30" subtitle="Consultation done" />
        <StatCard title="Upcoming Shifts" value={Math.max(myShiftCount - 1, 0)} icon={Calendar} color="bg-[#c4b5e8]/20" subtitle="From roster" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">My Schedule</h3>
          <div className="space-y-2">
            {todayAppointments.map((shift) => (
              <div key={shift.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{shift.date}</span>
                  <span className="px-2 py-1 rounded-md bg-[#a9d4b8]/30 text-xs text-foreground">{shift.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{shift.time}</p>
                <p className="text-xs text-muted-foreground">{shift.provider}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Today's Tasks</h3>
          <div className="space-y-2">
            {["Pre-appointment Setup", "Patient Vitals", "Equipment Check", "Post-care Notes"].map((task, i) => (
              <div key={i} className="p-4 rounded-lg bg-[#a9d4b8]/10 border border-border">
                <p className="text-sm font-medium text-foreground">{task}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
