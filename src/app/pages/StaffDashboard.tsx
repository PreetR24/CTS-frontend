import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../api/masterdataApi";
import { searchOnCall, searchRosterAssignments } from "../../api/operationsApi";
import { fetchUsers } from "../../api/usersApi";
import { meApi } from "../../api/authApi";

export default function StaffDashboard() {
  const [myShifts, setMyShifts] = useState<Array<{ id: number; date: string; shift: string; site: string; status: string }>>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [me, users, providers, services, appts, assigns, onCalls] = await Promise.all([
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
        setMyShifts([
          ...assigns.filter((a) => a.userId === uid).map((a) => ({
            id: a.assignmentId,
            date: a.date,
            shift: "Assigned Shift",
            site: "Assigned Site",
            status: a.status,
          })),
          ...onCalls
            .filter((o) => o.primaryUserId === uid || o.backupUserId === uid)
            .map((o) => ({
              id: 100000 + o.onCallId,
              date: o.date,
              shift: `${o.startTime}-${o.endTime}`,
              site: "OnCall Site",
              status: o.status,
            })),
        ]);
        setAppointments(appts);
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) {
          setMyShifts([]);
          setAppointments([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments = useMemo(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        patientName: patientNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        provider: providerNames.get(apt.providerId) ?? `Provider #${apt.providerId}`,
        time: apt.startTime,
        status: apt.status,
      })),
    [appointments, patientNames, serviceNames, providerNames]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title="Staff Dashboard" userName="Sneha Reddy" userRole="Nurse" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Shift"
            value={myShifts[0]?.shift ?? "—"}
            icon={Clock}
            color="bg-[#c4f0d4]/30"
            subtitle="Morning shift"
          />
          <StatCard
            title="Total Patients"
            value={todayAppointments.length}
            icon={Users}
            color="bg-[#a8c4d4]/20"
            subtitle="Scheduled today"
          />
          <StatCard
            title="Completed"
            value={todayAppointments.filter(a => a.status === "Completed").length}
            icon={CheckCircle}
            color="bg-[#f5d4c4]/30"
            subtitle="Consultation done"
          />
          <StatCard
            title="Upcoming Shifts"
            value={myShifts.length - 1}
            icon={Calendar}
            color="bg-[#d4c4f0]/20"
            subtitle="This week"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">My Schedule</h3>
            <div className="space-y-2">
              {myShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{shift.date}</span>
                    <span className="px-2 py-1 rounded-md bg-[#c4f0d4]/30 text-xs text-foreground">
                      {shift.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{shift.shift}</p>
                  <p className="text-xs text-muted-foreground">{shift.site}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Today's Tasks</h3>
            <div className="space-y-2">
              <div className="p-4 rounded-lg bg-[#c4f0d4]/10 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#c4f0d4]"></div>
                  <p className="text-sm font-medium text-foreground">Pre-appointment Setup</p>
                </div>
                <p className="text-xs text-muted-foreground">Prepare examination rooms</p>
              </div>
              <div className="p-4 rounded-lg bg-[#a8c4d4]/10 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#a8c4d4]"></div>
                  <p className="text-sm font-medium text-foreground">Patient Vitals</p>
                </div>
                <p className="text-xs text-muted-foreground">Record vital signs for patients</p>
              </div>
              <div className="p-4 rounded-lg bg-[#f5d4c4]/10 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#f5d4c4]"></div>
                  <p className="text-sm font-medium text-foreground">Equipment Check</p>
                </div>
                <p className="text-xs text-muted-foreground">Verify all medical equipment</p>
              </div>
              <div className="p-4 rounded-lg bg-[#d4c4f0]/10 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4c4f0]"></div>
                  <p className="text-sm font-medium text-foreground">Post-care Notes</p>
                </div>
                <p className="text-xs text-muted-foreground">Document patient care activities</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-medium text-foreground">Today's Appointments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Patient flow for your shift</p>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-primary-foreground bg-primary/20 px-3 py-1.5 rounded">
                      {apt.time}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {apt.service} • {apt.provider}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-md text-xs ${
                      apt.status === "CheckedIn"
                        ? "bg-[#c4f0d4]/30 text-foreground"
                        : apt.status === "Completed"
                        ? "bg-[#a8c4d4]/30 text-foreground"
                        : "bg-[#f5e6d3]/50 text-foreground"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
