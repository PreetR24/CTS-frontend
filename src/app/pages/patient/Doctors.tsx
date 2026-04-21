import { useEffect, useMemo, useState } from "react";
import { fetchProviders, fetchServices, fetchSites, type ProviderDto, type ServiceDto, type SiteDto } from "../../../api/masterdataApi";
import { searchOpenSlots, type SlotDto } from "../../../api/slotsApi";

export default function PatientDoctors() {
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotsForSelection, setSlotsForSelection] = useState<SlotDto[]>([]);
  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s, si] = await Promise.all([fetchProviders(), fetchServices(), fetchSites({ page: 1, pageSize: 250 })]);
        if (cancelled) return;
        setProviders(p.filter((x) => x.status === "Active"));
        setServices(s.filter((x) => x.status === "Active"));
        setSites(si.filter((x) => x.status === "Active"));
      } catch {
        if (!cancelled) {
          setProviders([]);
          setServices([]);
          setSites([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSites = useMemo(() => sites.filter((s) => s.status === "Active"), [sites]);
  const activeServices = useMemo(() => services.filter((s) => s.status === "Active"), [services]);
  const activeProviders = useMemo(() => providers.filter((p) => p.status === "Active"), [providers]);

  const siteOptions = useMemo(() => {
    if (!providerId) return activeSites;
    const byProvider = new Set(slotsForSelection.filter((s) => s.providerId === Number(providerId)).map((s) => s.siteId));
    if (byProvider.size === 0) return activeSites;
    return activeSites.filter((s) => byProvider.has(s.siteId));
  }, [activeSites, providerId, slotsForSelection]);

  const doctorOptions = useMemo(() => {
    if (!siteId || !serviceId || !date) return activeProviders;
    const allowed = new Set(slotsForSelection.map((s) => s.providerId));
    if (allowed.size === 0) return [];
    return activeProviders.filter((p) => allowed.has(p.providerId));
  }, [activeProviders, siteId, serviceId, date, slotsForSelection]);

  const refreshDoctorOptions = async (nextSiteId: string, nextServiceId: string, nextDate: string) => {
    if (!nextSiteId || !nextServiceId || !nextDate) {
      setSlotsForSelection([]);
      return;
    }
    setLoadingDoctors(true);
    try {
      const responses = await Promise.all(
        activeProviders.map(async (provider) => {
          try {
            const open = await searchOpenSlots({
              providerId: provider.providerId,
              serviceId: Number(nextServiceId),
              siteId: Number(nextSiteId),
              date: nextDate,
            });
            return open.filter((s) => s.status.toLowerCase() === "open");
          } catch {
            return [] as SlotDto[];
          }
        })
      );
      const merged = responses.flat();
      setSlotsForSelection(merged);
      const allowedProviderIds = new Set(merged.map((s) => s.providerId));
      if (!allowedProviderIds.has(Number(providerId || 0))) {
        const first = merged[0]?.providerId;
        setProviderId(first ? String(first) : "");
      }
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadSlots = async () => {
    if (!providerId || !serviceId || !siteId || !date) return;
    const data = await searchOpenSlots({
      providerId: Number(providerId),
      serviceId: Number(serviceId),
      siteId: Number(siteId),
      date,
    });
    setSlots(data);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Doctors, Services & Slots</h1>
        <p className="text-sm text-muted-foreground mt-1">Select in sequence: Site → Service → Doctor → Date, then view slots</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <select
          value={siteId}
          onChange={(e) => {
            const val = e.target.value;
            setSiteId(val);
            void refreshDoctorOptions(val, serviceId, date);
          }}
          className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        >
          <option value="">Select Site</option>
          {siteOptions.map((s) => (
            <option key={s.siteId} value={s.siteId}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={serviceId}
          onChange={(e) => {
            const val = e.target.value;
            setServiceId(val);
            void refreshDoctorOptions(siteId, val, date);
          }}
          className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        >
          <option value="">Select Service</option>
          {activeServices.map((s) => (
            <option key={s.serviceId} value={s.serviceId}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
        <option value="">{loadingDoctors === true ? "Loading doctors..." : (doctorOptions.length === 0 ? "No doctors found" : "Select Doctor")}</option>
          {doctorOptions.map((p) => (
            <option key={p.providerId} value={p.providerId}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            const val = e.target.value;
            setDate(val);
            void refreshDoctorOptions(siteId, serviceId, val);
          }}
          className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        />
        <button onClick={() => void loadSlots()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
          Show Slots
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-sm font-medium text-foreground mb-3">Available Slots</p>
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.pubSlotId} className="p-3 rounded-lg border border-border text-sm text-muted-foreground">
              {slot.slotDate} {slot.startTime}-{slot.endTime} (Status: {slot.status})
            </div>
          ))}
          {slots.length === 0 && <p className="text-sm text-muted-foreground">No slots loaded yet.</p>}
        </div>
      </div>
    </div>
  );
}
