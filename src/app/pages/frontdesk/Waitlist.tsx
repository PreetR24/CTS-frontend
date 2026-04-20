import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { fillWaitlist, removeWaitlist, searchWaitlist, type WaitlistDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type WaitlistRow = {
  id: number;
  patient: string;
  provider: string;
  service: string;
  priority: string;
  requestedDate: string;
};

export default function FrontDeskWaitlist() {
  const [items, setItems] = useState<WaitlistDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

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

  const waitlistRows: WaitlistRow[] = items.map((item) => ({
    id: item.waitId,
    patient: userNames.get(item.patientId) ?? "Unknown Patient",
    provider: providerNames.get(item.providerId) ?? "Unknown Provider",
    service: serviceNames.get(item.serviceId) ?? "Unknown Service",
    priority: item.priority,
    requestedDate: item.requestedDate,
  }));

  const refreshWaitlist = async () => {
    const waitlist = await searchWaitlist();
    setItems(waitlist);
  };

  const handleFill = async (waitId: number) => {
    try {
      await fillWaitlist(waitId, "FrontDesk");
      await refreshWaitlist();
    } catch {
      // leave UI unchanged
    }
  };

  const handleRemove = async (waitId: number) => {
    try {
      await removeWaitlist(waitId);
      await refreshWaitlist();
    } catch {
      // leave UI unchanged
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Waitlist</h1>
        <p className="text-sm text-muted-foreground mt-1">Patients waiting for available slots</p>
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
              {waitlistRows.map((item) => (
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
                      onClick={() => handleFill(item.id)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                    >
                      Book Slot
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="ml-2 px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
