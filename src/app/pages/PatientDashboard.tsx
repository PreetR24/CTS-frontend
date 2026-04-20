import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Calendar, Clock, FileText, Bell } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../api/appointmentsApi";
import { meApi } from "../../api/authApi";
import { fetchProviders, fetchServices, fetchSites } from "../../api/masterdataApi";

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

  const myAppointments = appointments.map((apt) => ({
    id: apt.appointmentId,
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    status: apt.status,
    date: apt.slotDate,
    time: apt.startTime,
    site: siteNames.get(apt.siteId) ?? "Unknown Site",
  }));

  const upcomingAppointments = myAppointments.filter(
    (apt) => apt.status === "Booked" || apt.status === "CheckedIn"
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title="Patient Portal" userName="Anjali Mehta" userRole="Patient" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Upcoming Appointments"
            value={upcomingAppointments.length}
            icon={Calendar}
            color="bg-[#f0d4e6]/40"
            subtitle="This month"
          />
          <StatCard
            title="Next Appointment"
            value="Mar 30"
            icon={Clock}
            color="bg-[#a8c4d4]/20"
            subtitle="2026 at 10:00 AM"
          />
          <StatCard
            title="Medical Records"
            value="8"
            icon={FileText}
            color="bg-[#d4c4f0]/20"
            subtitle="Available documents"
          />
          <StatCard
            title="Reminders"
            value="2"
            icon={Bell}
            color="bg-[#f5d4c4]/30"
            subtitle="Pending actions"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">My Appointments</h3>
            <div className="space-y-3">
              {myAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.service}</p>
                      <p className="text-xs text-muted-foreground mt-1">with {apt.provider}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-md text-xs ${
                        apt.status === "Booked"
                          ? "bg-[#a8c4d4]/30 text-foreground"
                          : apt.status === "Completed"
                          ? "bg-[#c4f0d4]/30 text-foreground"
                          : "bg-[#f5d4c4]/30 text-foreground"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{apt.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{apt.time}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{apt.site}</p>
                  {apt.status === "Booked" && (
                    <div className="flex gap-2 mt-3">
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                        Reschedule
                      </button>
                      <button className="px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-xs">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#f0d4e6]/30 hover:bg-[#f0d4e6]/50 transition-colors">
                  <p className="text-sm font-medium text-foreground">Book Appointment</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#a8c4d4]/10 hover:bg-[#a8c4d4]/20 transition-colors">
                  <p className="text-sm font-medium text-foreground">View Medical Records</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#d4c4f0]/10 hover:bg-[#d4c4f0]/20 transition-colors">
                  <p className="text-sm font-medium text-foreground">Prescription Refill</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#f5d4c4]/20 hover:bg-[#f5d4c4]/30 transition-colors">
                  <p className="text-sm font-medium text-foreground">Contact Support</p>
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Reminders</h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-[#f5d4c4]/20 border border-border">
                  <div className="flex items-start gap-2">
                    <Bell className="w-4 h-4 text-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Appointment Tomorrow</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cardiology consultation at 10:00 AM
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#a8c4d4]/10 border border-border">
                  <div className="flex items-start gap-2">
                    <Bell className="w-4 h-4 text-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Lab Results Ready</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your recent test results are available
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Health Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#c4f0d4]/10 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Last Visit</p>
              <p className="text-sm font-medium text-foreground">March 15, 2026</p>
              <p className="text-xs text-muted-foreground mt-1">General Checkup</p>
            </div>
            <div className="p-4 rounded-lg bg-[#a8c4d4]/10 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Active Medications</p>
              <p className="text-sm font-medium text-foreground">2 Prescriptions</p>
              <p className="text-xs text-muted-foreground mt-1">All up to date</p>
            </div>
            <div className="p-4 rounded-lg bg-[#d4c4f0]/10 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Upcoming Tests</p>
              <p className="text-sm font-medium text-foreground">1 Scheduled</p>
              <p className="text-xs text-muted-foreground mt-1">Blood work on Apr 5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
