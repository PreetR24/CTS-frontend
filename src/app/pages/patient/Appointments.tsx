import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
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
import { getOutcomeByAppointment, type OutcomeDto } from "../../../api/outcomesApi";

type AppointmentRow = {
  id: number;
  service: string;
  provider: string;
  status: string;
  date: string;
  time: string;
  site: string;
};
type BookFormValues = {
  siteId: string;
  serviceId: string;
  providerId: string;
  date: string;
  slotId: string;
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
  const [outcomesByAppointmentId, setOutcomesByAppointmentId] = useState<Record<number, OutcomeDto>>({});
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
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const {
    register: registerBook,
    handleSubmit: handleBookSubmit,
    setValue: setBookValue,
    reset: resetBookForm,
    formState: { errors: bookErrors },
  } = useForm<BookFormValues>({
    defaultValues: {
      siteId: "",
      serviceId: "",
      providerId: "",
      date: new Date().toISOString().slice(0, 10),
      slotId: "",
    },
  });
  const {
    register: registerReschedule,
    handleSubmit: handleRescheduleSubmit,
    setValue: setRescheduleValue,
    reset: resetRescheduleForm,
    formState: { errors: rescheduleErrors },
  } = useForm<{ slotId: string }>({ defaultValues: { slotId: "" } });

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
        const completed = list.filter((a) => a.status === "Completed");
        const outcomes = await Promise.all(
          completed.map(async (a) => {
            const outcome = await getOutcomeByAppointment(a.appointmentId);
            return outcome ? ([a.appointmentId, outcome] as const) : null;
          })
        );
        if (cancelled) return;
        const outcomeMap: Record<number, OutcomeDto> = {};
        outcomes.forEach((entry) => {
          if (!entry) return;
          outcomeMap[entry[0]] = entry[1];
        });
        setOutcomesByAppointmentId(outcomeMap);
        setProviders(providers);
        setServices(services);
        setSites(sites);
        setNewProviderId(String(providers[0]?.providerId ?? ""));
        setNewServiceId(String(services[0]?.serviceId ?? ""));
        setNewSiteId(String(sites[0]?.siteId ?? ""));
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setOutcomesByAppointmentId({});
        }
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
  const filteredAppointments = useMemo(
    () =>
      myAppointments.filter((apt) => {
        const statusMatch = statusFilter === "All" || apt.status === statusFilter;
        const dateMatch = !dateFilter || apt.date === dateFilter;
        return statusMatch && dateMatch;
      }),
    [myAppointments, statusFilter, dateFilter]
  );

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
      setActionError(null);
      setActionNotice(null);
      await cancelAppointment(appointmentId, { reason: "Cancelled by patient" });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
        setOutcomesByAppointmentId((prev) => {
          const next = { ...prev };
          delete next[appointmentId];
          return next;
        });
      }
      setActionNotice("Appointment cancelled.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setActionError(msg ?? "Could not cancel appointment.");
    }
  };

  const loadSlotsForBooking = async (providerId: number, serviceId: number, siteId: number, date: string) => {
    const slots = await searchOpenSlots({ providerId, serviceId, siteId, date });
    const open = slots.filter((s) => s.status.toLowerCase() === "open");
    setSlotOptions(open);
    setBookValue("slotId", String(open[0]?.pubSlotId ?? ""));
    setRescheduleValue("slotId", String(open[0]?.pubSlotId ?? ""));
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
      setActionError(null);
      setActionNotice(null);
      await rescheduleAppointment(appointment.appointmentId, {
        newPublishedSlotId: slotId,
        reason: "Rescheduled by patient",
      });
      if (patientId != null) {
        const refreshed = await searchAppointments({ patientId });
        setAppointments(refreshed);
        setOutcomesByAppointmentId((prev) => {
          const next = { ...prev };
          delete next[appointment.appointmentId];
          return next;
        });
      }
      setActionNotice("Appointment rescheduled.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setActionError(msg ?? "Could not reschedule appointment.");
    }
  };

  const openBookModal = async () => {
    setActionError(null);
    setActionNotice(null);
    setShowBookModal(true);
    const s = String(services[0]?.serviceId ?? "");
    const si = String(sites[0]?.siteId ?? "");
    const p = String(providers[0]?.providerId ?? "");
    setNewServiceId((prev) => prev || s);
    setNewSiteId((prev) => prev || si);
    setNewProviderId((prev) => prev || p);
    resetBookForm({
      siteId: si || newSiteId,
      serviceId: s || newServiceId,
      providerId: p || newProviderId,
      date: newDate,
      slotId: "",
    });
    await refreshDoctorOptions(si || newSiteId, s || newServiceId, newDate);
  };

  const submitNewAppointment = async (values: { slotId: string }) => {
    if (!patientId) return;
    try {
      setActionError(null);
      setActionNotice(null);
      await bookAppointment({ publishedSlotId: Number(values.slotId), patientId, bookingChannel: "Portal" });
      const refreshed = await searchAppointments({ patientId });
      setAppointments(refreshed);
      setActionNotice("Appointment booked.");
      setShowBookModal(false);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setActionError(msg ?? "Could not book appointment.");
    }
  };

  const openDetails = async (appointmentId: number) => {
    try {
      setActionError(null);
      const data = await getAppointmentById(appointmentId);
      setSelectedDetails(data);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setActionError(msg ?? "Could not load appointment details.");
    }
  };

  const openRescheduleModal = async () => {
    if (!selectedDetails) return;
    setActionError(null);
    setRescheduleFor(selectedDetails);
    setShowRescheduleModal(true);
    resetRescheduleForm({ slotId: "" });
    await loadSlotsForBooking(selectedDetails.providerId, selectedDetails.serviceId, selectedDetails.siteId, selectedDetails.slotDate);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your appointments</p>
        {actionError && <p className="text-sm text-destructive mt-2">{actionError}</p>}
        {actionNotice && <p className="text-sm text-primary mt-2">{actionNotice}</p>}
        <button onClick={() => void openBookModal()} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
          New Appointment
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="All">All</option>
                <option value="Booked">Booked</option>
                <option value="CheckedIn">CheckedIn</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="NoShow">NoShow</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("All");
                  setDateFilter("");
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        {filteredAppointments.map((apt) => (
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
            {apt.status === "Completed" && outcomesByAppointmentId[apt.id] && (
              <p className="text-sm text-foreground mb-3">
                Outcome: {outcomesByAppointmentId[apt.id].outcome}
                {outcomesByAppointmentId[apt.id].notes ? ` - ${outcomesByAppointmentId[apt.id].notes}` : ""}
              </p>
            )}
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
        {filteredAppointments.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground">
            No appointments found for selected filters.
          </div>
        )}
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
            <form onSubmit={handleBookSubmit(submitNewAppointment)}>
            {(() => {
              const siteField = registerBook("siteId", { required: "Site is required." });
              const serviceField = registerBook("serviceId", { required: "Service is required." });
              const providerField = registerBook("providerId", { required: "Doctor is required." });
              const dateField = registerBook("date", { required: "Date is required." });
              return (
                <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <select
                  {...siteField}
                  value={newSiteId}
                  onChange={(e) => {
                    siteField.onChange(e);
                    const val = e.target.value;
                    setNewSiteId(val);
                    setBookValue("siteId", val, { shouldValidate: true });
                    void refreshDoctorOptions(val, newServiceId, newDate);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                >
                  <option value="">Select Site</option>
                  {siteOptions.map((s) => <option key={s.siteId} value={s.siteId}>{s.name}</option>)}
                </select>
                {bookErrors.siteId && <p className="text-xs text-destructive mt-1">{bookErrors.siteId.message}</p>}
              </div>
              <div>
                <select
                  {...serviceField}
                  value={newServiceId}
                  onChange={(e) => {
                    serviceField.onChange(e);
                    const val = e.target.value;
                    setNewServiceId(val);
                    setBookValue("serviceId", val, { shouldValidate: true });
                    void refreshDoctorOptions(newSiteId, val, newDate);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                >
                  <option value="">Select Service</option>
                  {activeServices.map((s) => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
                </select>
                {bookErrors.serviceId && <p className="text-xs text-destructive mt-1">{bookErrors.serviceId.message}</p>}
              </div>
              <div>
                <select
                  {...providerField}
                  value={newProviderId}
                  onChange={(e) => {
                    providerField.onChange(e);
                    const val = e.target.value;
                    setNewProviderId(val);
                    setBookValue("providerId", val, { shouldValidate: true });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                >
                  <option value="">{loadingDoctors === true ? "Loading doctors..." : (doctorOptions.length === 0 ? "No doctors found" : "Select Doctor")}</option>
                  {doctorOptions.map((p) => <option key={p.providerId} value={p.providerId}>{p.name}</option>)}
                </select>
                {bookErrors.providerId && <p className="text-xs text-destructive mt-1">{bookErrors.providerId.message}</p>}
              </div>
              <div>
                <input
                  type="date"
                  {...dateField}
                  min={new Date().toISOString().slice(0, 10)}
                  value={newDate}
                  onChange={(e) => {
                    dateField.onChange(e);
                    const val = e.target.value;
                    setNewDate(val);
                    setBookValue("date", val, { shouldValidate: true });
                    void refreshDoctorOptions(newSiteId, newServiceId, val);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                />
                {bookErrors.date && <p className="text-xs text-destructive mt-1">{bookErrors.date.message}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadSlotsForBooking(Number(newProviderId), Number(newServiceId), Number(newSiteId), newDate)}
              className="mt-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Load Slots
            </button>
            <select
              {...registerBook("slotId", { required: "Please select a slot." })}
              className="mt-3 w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            >
              <option value="">Select slot</option>
              {slotOptions.map((s) => (
                <option key={s.pubSlotId} value={s.pubSlotId}>{s.slotDate} {s.startTime}-{s.endTime}</option>
              ))}
            </select>
            {bookErrors.slotId && <p className="text-xs text-destructive mt-1">{bookErrors.slotId.message}</p>}
            </>
              );
            })()}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowBookModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Book</button>
            </div>
            </form>
          </div>
        </div>
      )}
      {showRescheduleModal && rescheduleFor && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Reschedule Appointment</h3>
            <form
              onSubmit={handleRescheduleSubmit(async (values) => {
                await handleReschedule(rescheduleFor, Number(values.slotId));
                setShowRescheduleModal(false);
                setSelectedDetails(null);
              })}
            >
            <select
              {...registerReschedule("slotId", { required: "Please select a new slot." })}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            >
              <option value="">Select new slot</option>
              {slotOptions.map((s) => (
                <option key={s.pubSlotId} value={s.pubSlotId}>{s.slotDate} {s.startTime}-{s.endTime}</option>
              ))}
            </select>
            {rescheduleErrors.slotId && <p className="text-xs text-destructive mt-1">{rescheduleErrors.slotId.message}</p>}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowRescheduleModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                Save
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
