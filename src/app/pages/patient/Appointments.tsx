import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import {
  bookAppointment,
  cancelAppointment,
  getAppointmentById,
  rescheduleAppointment,
  searchAppointments,
  type AppointmentDto,
} from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchProviders, fetchServices, fetchSites, type ProviderDto, type ServiceDto, type SiteDto } from "../../../api/masterdataApi";
import { searchOpenSlots, type SlotDto } from "../../../api/slotsApi";

type AppointmentRow = {
  id: number;
  service: string;
  provider: string;
  status: string;
  date: string;
  time: string;
  site: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AppointmentDto | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newProviderId, setNewProviderId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newSiteId, setNewSiteId] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotOptions, setSlotOptions] = useState<SlotDto[]>([]);
  const [slotsForSelection, setSlotsForSelection] = useState<SlotDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentDto | null>(null);

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
        setPatientId(me.userId);
        const list = await searchAppointments({ patientId: me.userId });
        if (cancelled) return;
        setAppointments(list);
        setProviders(providers);
        setServices(services);
        setSites(sites);
        setNewProviderId(String(providers[0]?.providerId ?? ""));
        setNewServiceId(String(services[0]?.serviceId ?? ""));
        setNewSiteId(String(sites[0]?.siteId ?? ""));
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    service: apt.serviceName?.trim() || `Service ${apt.serviceId}`,
    provider: apt.providerName?.trim() || `Doctor ${apt.providerId}`,
    status: apt.status,
    date: apt.slotDate,
    time: to12Hour(apt.startTime),
    site: apt.siteName?.trim() || `Site ${apt.siteId}`,
  }));

  const activeSites = useMemo(() => sites.filter((s) => s.status === "Active"), [sites]);
  const activeServices = useMemo(() => services.filter((s) => s.status === "Active"), [services]);
  const activeProviders = useMemo(() => providers.filter((p) => p.status === "Active"), [providers]);

  const siteOptions = useMemo(() => {
    if (!newProviderId) return activeSites;
    const allowed = new Set(slotsForSelection.filter((s) => s.providerId === Number(newProviderId)).map((s) => s.siteId));
    if (allowed.size === 0) return activeSites;
    return activeSites.filter((s) => allowed.has(s.siteId));
  }, [activeSites, newProviderId, slotsForSelection]);

  const doctorOptions = useMemo(() => {
    if (!newSiteId || !newServiceId || !newDate) return activeProviders;
    const allowed = new Set(slotsForSelection.map((s) => s.providerId));
    if (allowed.size === 0) return [];
    return activeProviders.filter((p) => allowed.has(p.providerId));
  }, [activeProviders, newSiteId, newServiceId, newDate, slotsForSelection]);

  const handleCancel = async (appointmentId: number) => {
    try {
      await cancelAppointment(appointmentId, { reason: "Cancelled by patient" });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
      }
    } catch {
      // keep UI unchanged; no toast yet
    }
  };

  const loadSlotsForBooking = async (providerId: number, serviceId: number, siteId: number, date: string) => {
    const slots = await searchOpenSlots({ providerId, serviceId, siteId, date });
    const open = slots.filter((s) => s.status.toLowerCase() === "open");
    setSlotOptions(open);
    setSelectedSlotId(String(open[0]?.pubSlotId ?? ""));
  };

  const refreshDoctorOptions = async (nextSiteId: string, nextServiceId: string, nextDate: string) => {
    if (!nextSiteId || !nextServiceId || !nextDate) {
      setSlotsForSelection([]);
      return;
    }
    setLoadingDoctors(true);
    try {
      const results = await Promise.all(
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
      const merged = results.flat();
      setSlotsForSelection(merged);
      const allowedIds = new Set(merged.map((s) => s.providerId));
      if (!allowedIds.has(Number(newProviderId || 0))) {
        const first = merged[0]?.providerId;
        setNewProviderId(first ? String(first) : "");
      }
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleReschedule = async (appointment: AppointmentDto, slotId: number) => {
    try {
      await rescheduleAppointment(appointment.appointmentId, {
        newPublishedSlotId: slotId,
        reason: "Rescheduled by patient",
      });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
      }
    } catch {
      // keep UI unchanged
    }
  };

  const openBookModal = async () => {
    setShowBookModal(true);
    const s = String(services[0]?.serviceId ?? "");
    const si = String(sites[0]?.siteId ?? "");
    setNewServiceId((prev) => prev || s);
    setNewSiteId((prev) => prev || si);
    await refreshDoctorOptions(si || newSiteId, s || newServiceId, newDate);
  };

  const submitNewAppointment = async () => {
    if (!patientId || !selectedSlotId) return;
    await bookAppointment({ publishedSlotId: Number(selectedSlotId), patientId, bookingChannel: "Portal" });
    const refreshed = await searchAppointments({ patientId });
    setAppointments(refreshed);
    setShowBookModal(false);
  };

  const openDetails = async (appointmentId: number) => {
    const data = await getAppointmentById(appointmentId);
    setSelectedDetails(data);
  };

  const openRescheduleModal = async () => {
    if (!selectedDetails) return;
    setRescheduleFor(selectedDetails);
    setShowRescheduleModal(true);
    await loadSlotsForBooking(selectedDetails.providerId, selectedDetails.serviceId, selectedDetails.siteId, selectedDetails.slotDate);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your appointments</p>
        <button onClick={() => void openBookModal()} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
          New Appointment
        </button>
      </div>

      <div className="space-y-4">
        {myAppointments.map((apt) => (
          <div key={apt.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-base font-medium text-foreground">{apt.service}</p>
                <p className="text-sm text-muted-foreground mt-1">with {apt.provider}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                apt.status === "Booked" ? "bg-[#7ba3c0]/30 text-foreground" :
                apt.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" :
                "bg-[#e8c9a9]/30 text-foreground"
              }`}>
                {apt.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{apt.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{apt.time}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{apt.site}</p>
            {(apt.status === "Booked" || apt.status === "CheckedIn" || apt.status === "Completed" || apt.status === "Cancelled" || apt.status === "NoShow") && (
              <div className="flex gap-2">
                <button
                  onClick={() => void openDetails(apt.id)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  View
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedDetails && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Appointment Details</h3>
            <p className="text-sm text-muted-foreground">Service: {selectedDetails.serviceName ?? `Service ${selectedDetails.serviceId}`}</p>
            <p className="text-sm text-muted-foreground">Doctor: {selectedDetails.providerName ?? `Doctor ${selectedDetails.providerId}`}</p>
            <p className="text-sm text-muted-foreground">Site: {selectedDetails.siteName ?? `Site ${selectedDetails.siteId}`}</p>
            <p className="text-sm text-muted-foreground">Date: {selectedDetails.slotDate}</p>
            <p className="text-sm text-muted-foreground">Time: {selectedDetails.startTime}-{selectedDetails.endTime}</p>
            <p className="text-sm text-muted-foreground">Status: {selectedDetails.status}</p>
            {selectedDetails.status === "Booked" && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => void openRescheduleModal()} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                  Reschedule
                </button>
                <button
                  onClick={async () => {
                    await handleCancel(selectedDetails.appointmentId);
                    setSelectedDetails(null);
                  }}
                  className="px-3 py-2 border border-border rounded-lg text-sm"
                >
                  Cancel Appointment
                </button>
              </div>
            )}
            <button
              onClick={() => setSelectedDetails(null)}
              className="mt-4 w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showBookModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Book Appointment</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newSiteId}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewSiteId(val);
                  void refreshDoctorOptions(val, newServiceId, newDate);
                }}
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="">Select Site</option>
                {siteOptions.map((s) => <option key={s.siteId} value={s.siteId}>{s.name}</option>)}
              </select>
              <select
                value={newServiceId}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewServiceId(val);
                  void refreshDoctorOptions(newSiteId, val, newDate);
                }}
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="">Select Service</option>
                {activeServices.map((s) => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
              </select>
              <select value={newProviderId} onChange={(e) => setNewProviderId(e.target.value)} className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                <option value="">{loadingDoctors === true ? "Loading doctors..." : (doctorOptions.length === 0 ? "No doctors found" : "Select Doctor")}</option>
                {doctorOptions.map((p) => <option key={p.providerId} value={p.providerId}>{p.name}</option>)}
              </select>
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewDate(val);
                  void refreshDoctorOptions(newSiteId, newServiceId, val);
                }}
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
            </div>
            <button
              onClick={() => void loadSlotsForBooking(Number(newProviderId), Number(newServiceId), Number(newSiteId), newDate)}
              className="mt-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Load Slots
            </button>
            <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} className="mt-3 w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
              <option value="">Select slot</option>
              {slotOptions.map((s) => (
                <option key={s.pubSlotId} value={s.pubSlotId}>{s.slotDate} {s.startTime}-{s.endTime}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBookModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={() => void submitNewAppointment()} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Book</button>
            </div>
          </div>
        </div>
      )}
      {showRescheduleModal && rescheduleFor && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Reschedule Appointment</h3>
            <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
              <option value="">Select new slot</option>
              {slotOptions.map((s) => (
                <option key={s.pubSlotId} value={s.pubSlotId}>{s.slotDate} {s.startTime}-{s.endTime}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRescheduleModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button
                onClick={async () => {
                  if (!selectedSlotId) return;
                  await handleReschedule(rescheduleFor, Number(selectedSlotId));
                  setShowRescheduleModal(false);
                  setSelectedDetails(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
