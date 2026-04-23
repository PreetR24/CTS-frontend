import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { removeWaitlist, searchWaitlist, type WaitlistDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type WaitlistRow = {
  id: number;
  patientId: number;
  providerId: number;
  serviceId: number;
  siteId: number;
  patient: string;
  provider: string;
  service: string;
  priority: string;
  requestedDate: string;
};

export default function FrontDeskWaitlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WaitlistDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const [busyWaitId, setBusyWaitId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [waitlist, users, providers, services] = await Promise.all([
          searchWaitlist(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchProviders(),
          fetchServices(),
        ]);
        if (cancelled) return;
        setItems(waitlist);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const waitlistRows: WaitlistRow[] = items
    .filter((item) => {
      const status = (item.status ?? "").toLowerCase();
      return status !== "removed" && status !== "filled" && status !== "cancelled";
    })
    .map((item) => ({
    id: item.waitId,
    patientId: item.patientId,
    providerId: item.providerId,
    serviceId: item.serviceId,
    siteId: item.siteId,
    patient: userNames.get(item.patientId) ?? "Unknown Patient",
    provider: providerNames.get(item.providerId) ?? "Unknown Provider",
    service: serviceNames.get(item.serviceId) ?? "Unknown Service",
    priority: item.priority,
    requestedDate: item.requestedDate,
  }));
  const filteredWaitlistRows = waitlistRows.filter((item) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return (
      item.patient.toLowerCase().includes(q) ||
      item.provider.toLowerCase().includes(q) ||
      item.service.toLowerCase().includes(q) ||
      item.priority.toLowerCase().includes(q) ||
      item.requestedDate.toLowerCase().includes(q)
    );
  });

  const refreshWaitlist = async () => {
    const waitlist = await searchWaitlist();
    setItems(waitlist);
  };

  const handleFill = async (row: WaitlistRow) => {
    try {
      setBusyWaitId(row.id);
      setNotice(null);
      const params = new URLSearchParams({
        fromWaitlist: "1",
        waitId: String(row.id),
        patientId: String(row.patientId),
        providerId: String(row.providerId),
        serviceId: String(row.serviceId),
        siteId: String(row.siteId),
        date: row.requestedDate,
      });
      setNotice("Continuing booking from waitlist...");
      navigate(`/frontdesk/appointments?${params.toString()}`);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not continue booking from waitlist.");
    } finally {
      setBusyWaitId(null);
    }
  };

  const handleRemove = async (waitId: number) => {
    try {
      setBusyWaitId(waitId);
      setNotice(null);
      await removeWaitlist(waitId);
      setItems((prev) => prev.filter((x) => x.waitId !== waitId));
      await refreshWaitlist().catch(() => undefined);
      setNotice("Waitlist entry removed.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not remove waitlist entry.");
    } finally {
      setBusyWaitId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Waitlist</h1>
        <p className="text-sm text-muted-foreground mt-1">Patients waiting for available slots</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>
      <div className="mb-4">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by patient, provider, service, priority, date"
          className="w-full md:w-[420px] px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Provider</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Service</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Requested Date</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWaitlistRows.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{item.patient}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{item.provider}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{item.service}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      item.priority === "High" ? "bg-[#eb9d9d]/30 text-foreground" : "bg-[#7ba3c0]/20 text-foreground"
                    }`}>
                      {item.priority === "High" && <AlertCircle className="w-3 h-3" />}
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{item.requestedDate}</td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleFill(item)}
                      disabled={busyWaitId === item.id}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                    >
                      {busyWaitId === item.id ? "Please wait..." : "Book Slot"}
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={busyWaitId === item.id}
                      className="ml-2 px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredWaitlistRows.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              {waitlistRows.length === 0 ? "No pending waitlist entries." : "No waitlist entries match your search."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
