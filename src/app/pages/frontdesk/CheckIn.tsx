import { useEffect, useState } from "react";
import { CheckCircle, User } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { createCheckIn } from "../../../api/checkinsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  time: string;
  provider: string;
  service: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function FrontDeskCheckIn() {
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
          searchAppointments({ date: today, status: "Booked" }),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
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

  const todayAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    patientName: userNames.get(apt.patientId) ?? "Unknown Patient",
    time: to12Hour(apt.startTime),
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
  }));

  const handleCheckIn = async (appointmentId: number) => {
    try {
      await createCheckIn(appointmentId);
      const today = new Date().toISOString().slice(0, 10);
      const refreshed = await searchAppointments({ date: today, status: "Booked" });
      setAppointments(refreshed);
    } catch {
      // no UI change
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Check-In</h1>
        <p className="text-sm text-muted-foreground mt-1">Check in patients for their appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todayAppointments.map((apt) => (
          <div key={apt.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#e8c9a9]/20 flex items-center justify-center">
                <User className="w-6 h-6 text-[#e8c9a9]" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                <p className="text-xs text-muted-foreground">{apt.time}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">Provider: {apt.provider}</p>
              <p className="text-xs text-muted-foreground">Service: {apt.service}</p>
            </div>
            <button
              onClick={() => handleCheckIn(apt.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Check In
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
