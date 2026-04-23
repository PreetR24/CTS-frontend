import { Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";

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
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!me.userId || cancelled) {
          if (!cancelled) setAppointments([]);
          return;
        }
        const list = await searchAppointments({ providerId: me.userId });
        if (cancelled) return;
        setAppointments(list);
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
      const resolvedName =
        visits.map((v) => v.patientName?.trim()).find((name) => Boolean(name)) || `Patient ${patientId}`;
      return {
        id: patientId,
        name: resolvedName,
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
                  <button
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                  >
                    View Records
                  </button>
                </div>
              </div>
            ))}
            {filteredPatients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No patients found.</p>
            )}
          </div>
        </div>
      </div>
      {selectedPatientId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-3xl shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-1">Patient Records</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {patients.find((p) => p.id === selectedPatientId)?.name ?? `Patient ${selectedPatientId}`}
            </p>
            <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Site</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter((a) => a.patientId === selectedPatientId)
                    .sort((a, b) =>
                      `${b.slotDate} ${b.startTime}`.localeCompare(`${a.slotDate} ${a.startTime}`)
                    )
                    .map((a) => (
                      <tr key={a.appointmentId} className="border-b border-border last:border-0">
                        <td className="py-2.5 px-3 text-sm text-foreground">{a.slotDate}</td>
                        <td className="py-2.5 px-3 text-sm text-muted-foreground">
                          {a.startTime} - {a.endTime}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-muted-foreground">
                          {a.serviceName?.trim() || `Service ${a.serviceId}`}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-muted-foreground">
                          {a.siteName?.trim() || `Site ${a.siteId}`}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-foreground">{a.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setSelectedPatientId(null)}
              className="mt-4 w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
