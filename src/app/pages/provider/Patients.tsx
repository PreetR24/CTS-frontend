import { Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type ProviderPatientRow = {
  id: number;
  name: string;
  lastVisit: string;
  totalVisits: number;
  condition: string;
};

export default function ProviderPatients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!me.providerId || cancelled) return;
        const [list, users] = await Promise.all([
          searchAppointments({ providerId: me.providerId }),
          fetchUsers({ role: "Patient", page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patients = (() => {
    const grouped = new Map<number, AppointmentDto[]>();
    for (const apt of appointments) {
      const bucket = grouped.get(apt.patientId) ?? [];
      bucket.push(apt);
      grouped.set(apt.patientId, bucket);
    }

    return Array.from(grouped.entries()).map(([patientId, visits]) => {
      const sorted = [...visits].sort((a, b) => (a.slotDate < b.slotDate ? 1 : -1));
      return {
        id: patientId,
        name: patientNames.get(patientId) ?? "Unknown Patient",
        lastVisit: sorted[0]?.slotDate ?? "-",
        totalVisits: visits.length,
        condition: "Active",
      };
    });
  })();

  const filteredPatients = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.condition.toLowerCase().includes(q) ||
        p.lastVisit.toLowerCase().includes(q)
    );
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">Patients under your care</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#e8b8d4]/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#e8b8d4]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{patient.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last visit: {patient.lastVisit} • Total visits: {patient.totalVisits}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                    View Records
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
