import { FileText, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";

type RecordRow = {
  id: number;
  title: string;
  date: string;
  provider: string;
  type: string;
};

export default function PatientRecords() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        const [list, providers, services] = await Promise.all([
          searchAppointments({ patientId: me.userId }),
          fetchProviders(),
          fetchServices(),
        ]);
        if (cancelled) return;
        setAppointments(list);
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

  const records: RecordRow[] = appointments.map((a) => ({
    id: a.appointmentId,
    title: serviceNames.get(a.serviceId) ?? "Unknown Service",
    date: a.slotDate,
    provider: providerNames.get(a.providerId) ?? "Unknown Provider",
    type: "Consultation Notes",
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Medical Records</h1>
        <p className="text-sm text-muted-foreground mt-1">Your health documents and reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((record) => (
          <div key={record.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#c4b5e8]/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#c4b5e8]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{record.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{record.type}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">Date: {record.date}</p>
              <p className="text-xs text-muted-foreground">Provider: {record.provider}</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
