import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type SearchResultRow = {
  appointmentId: number;
  patientLabel: string;
  providerName: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
};

export default function FrontDeskSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [appointmentList, providers, services, users] = await Promise.all([
          searchAppointments(),
          fetchProviders(),
          fetchServices(),
          fetchUsers({ role: "Patient", page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setAppointments(appointmentList);
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) {
          setAppointments([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: SearchResultRow[] = appointments.map((apt) => ({
    appointmentId: apt.appointmentId,
    patientLabel: patientNames.get(apt.patientId) ?? "Unknown Patient",
    providerName: providerNames.get(apt.providerId) ?? "Unknown Provider",
    serviceName: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    date: apt.slotDate,
    time: apt.startTime,
    status: apt.status,
  }));

  const filteredRows = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return rows.filter(
      (row) =>
        row.patientLabel.toLowerCase().includes(q) ||
        row.providerName.toLowerCase().includes(q) ||
        row.serviceName.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.date.toLowerCase().includes(q) ||
        String(row.appointmentId).includes(q)
    );
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Search Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">Find patient records and appointments</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient id, provider, service, status, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {!searchQuery && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Enter a search term to find appointment-linked patients</p>
            </div>
          )}

          {!!searchQuery && (
            <div className="space-y-3">
              {filteredRows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No matching records found.
                </p>
              )}
              {filteredRows.map((row) => (
                <div key={row.appointmentId} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{row.patientLabel}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.providerName} • {row.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.date} {row.time}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-secondary text-foreground">
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
