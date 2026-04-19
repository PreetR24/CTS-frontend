import { useEffect, useMemo, useState } from "react";
import { Clock, User, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { markAppointmentCheckedIn, searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  provider: string;
  service: string;
  date: string;
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

export default function FrontDeskQueue() {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [list, users, providers, services] = await Promise.all([
          searchAppointments({ date: today }),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
          fetchServices(),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) setAppointments([]);
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
        patientName: userNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        provider: providerNames.get(apt.providerId) ?? `Provider #${apt.providerId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        date: apt.slotDate,
        time: to12Hour(apt.startTime),
        status: apt.status,
      })),
    [appointments, userNames, providerNames, serviceNames]
  );
  
  const statusCounts = {
    all: todayAppointments.length,
    waiting: todayAppointments.filter(apt => apt.status === "Booked").length,
    checkedIn: todayAppointments.filter(apt => apt.status === "CheckedIn").length,
    inProgress: todayAppointments.filter(apt => apt.status === "InProgress").length,
    completed: todayAppointments.filter(apt => apt.status === "Completed").length,
  };

  const filteredAppointments = selectedStatus === "All" 
    ? todayAppointments 
    : todayAppointments.filter(apt => apt.status === selectedStatus);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      await markAppointmentCheckedIn(appointmentId);
      const today = new Date().toISOString().slice(0, 10);
      const refreshed = await searchAppointments({ date: today });
      setAppointments(refreshed);
    } catch {
      // keep layout unchanged
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Booked": return { bg: "bg-[#f0b895]/20", text: "text-[#d89768]", border: "border-[#f0b895]/40" };
      case "CheckedIn": return { bg: "bg-[#6b9bd1]/20", text: "text-[#5a8bc1]", border: "border-[#6b9bd1]/40" };
      case "InProgress": return { bg: "bg-[#a68fcf]/20", text: "text-[#9478bf]", border: "border-[#a68fcf]/40" };
      case "Completed": return { bg: "bg-[#95d4a8]/20", text: "text-[#75b488]", border: "border-[#95d4a8]/40" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Queue Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time patient flow and status</p>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <button
          onClick={() => setSelectedStatus("All")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "All" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          <Activity className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.all}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Today</p>
        </button>
        
        <button
          onClick={() => setSelectedStatus("Booked")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "Booked" ? "border-[#f0b895] bg-[#f0b895]/5" : "border-border hover:border-[#f0b895]/30"
          }`}
        >
          <Clock className="w-5 h-5 text-[#d89768] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.waiting}</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting</p>
        </button>

        <button
          onClick={() => setSelectedStatus("CheckedIn")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "CheckedIn" ? "border-[#6b9bd1] bg-[#6b9bd1]/5" : "border-border hover:border-[#6b9bd1]/30"
          }`}
        >
          <User className="w-5 h-5 text-[#5a8bc1] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.checkedIn}</p>
          <p className="text-xs text-muted-foreground mt-1">Checked In</p>
        </button>

        <button
          onClick={() => setSelectedStatus("InProgress")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "InProgress" ? "border-[#a68fcf] bg-[#a68fcf]/5" : "border-border hover:border-[#a68fcf]/30"
          }`}
        >
          <AlertCircle className="w-5 h-5 text-[#9478bf] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.inProgress || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">In Progress</p>
        </button>

        <button
          onClick={() => setSelectedStatus("Completed")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "Completed" ? "border-[#95d4a8] bg-[#95d4a8]/5" : "border-border hover:border-[#95d4a8]/30"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-[#75b488] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </button>
      </div>

      {/* Queue List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Patient Queue</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredAppointments.length} {selectedStatus === "All" ? "total" : selectedStatus.toLowerCase()} appointments
              </p>
            </div>
            <select className="px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>All Providers</option>
              <option>Dr. Rajesh Kumar</option>
              <option>Dr. Priya Sharma</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredAppointments.map((apt, index) => {
            const colors = getStatusColor(apt.status);
            return (
              <div key={apt.id} className="p-5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Token Number */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-white/80">Token</p>
                        <p className="text-lg font-bold text-white">#{index + 1}</p>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-medium text-foreground">{apt.patientName}</p>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{apt.service}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {apt.provider}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.time}
                        </span>
                      </div>
                    </div>

                    {/* Wait Time */}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Wait Time</p>
                      <p className="text-lg font-medium text-foreground">12 min</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    {apt.status === "Booked" && (
                      <button
                        onClick={() => handleCheckIn(apt.id)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
                      >
                        Check In
                      </button>
                    )}
                    {apt.status === "CheckedIn" && (
                      <button className="px-4 py-2 rounded-lg bg-[#a68fcf] text-white text-sm font-medium hover:shadow-md transition-all">
                        In Room
                      </button>
                    )}
                    {apt.status === "Completed" && (
                      <CheckCircle2 className="w-8 h-8 text-[#95d4a8]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
