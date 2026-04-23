import { useEffect, useRef, useState } from "react";
import { User, Stethoscope, Clock, CheckCircle, Search, ArrowRight } from "lucide-react";
import { isAxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchProviders,
  fetchServicesByProvider,
  fetchServices,
  fetchSites,
  getProviderById,
  getServiceById,
  getSiteById,
} from "../../../api/masterdataApi";
import { mapServiceRow, type AdminServiceRow } from "../../../api/adminViewMappers";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import { searchOpenSlots, type SlotDto } from "../../../api/slotsApi";
import { bookAppointment, createWaitlist, fillWaitlist } from "../../../api/appointmentsApi";
import { createCharge, searchCharges } from "../../../api/frontdeskBillingApi";

type BookingProvider = { id: number; name: string; specialty: string };

export default function FrontDeskBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const waitlistPrefillAppliedRef = useRef(false);
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<UserDto | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<BookingProvider | null>(null);
  const [selectedService, setSelectedService] = useState<AdminServiceRow | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [allProviders, setAllProviders] = useState<BookingProvider[]>([]);
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [allServices, setAllServices] = useState<AdminServiceRow[]>([]);
  const [patients, setPatients] = useState<UserDto[]>([]);
  const [sites, setSites] = useState<Array<{ siteId: number; name: string }>>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<SlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [manualPatientId, setManualPatientId] = useState<number | null>(null);
  const [reviewProviderName, setReviewProviderName] = useState<string | null>(null);
  const [reviewServiceName, setReviewServiceName] = useState<string | null>(null);
  const [reviewSiteName, setReviewSiteName] = useState<string | null>(null);
  const [chargeSummary, setChargeSummary] = useState<string | null>(null);

  const prefillWaitId = Number(searchParams.get("waitId") ?? "");
  const prefillPatientId = Number(searchParams.get("patientId") ?? "");
  const prefillProviderId = Number(searchParams.get("providerId") ?? "");
  const prefillServiceId = Number(searchParams.get("serviceId") ?? "");
  const prefillSiteId = Number(searchParams.get("siteId") ?? "");
  const prefillDate = searchParams.get("date") ?? "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const [provList, svcList, users, sites] = await Promise.all([
          fetchProviders(),
          fetchServices(),
          fetchUsers({ role: "Patient", page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchSites({ page: 1, pageSize: 50 }),
        ]);
        if (cancelled) return;
        setProviders(
          provList.map((p) => ({
            id: p.providerId,
            name: p.name,
            specialty: p.specialty?.trim() || "—",
          }))
        );
        setAllProviders(
          provList.map((p) => ({
            id: p.providerId,
            name: p.name,
            specialty: p.specialty?.trim() || "—",
          }))
        );
        setServices(svcList.map(mapServiceRow));
        setAllServices(svcList.map(mapServiceRow));
        setPatients(users);
        const activeSites = sites.filter((s) => s.status === "Active");
        const siteOptions = activeSites.map((s) => ({ siteId: s.siteId, name: s.name }));

        setSites(siteOptions);
        setSiteId(siteOptions[0]?.siteId ?? null);
      } catch {
        if (!cancelled) setLoadError("Could not load providers or services.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step !== 3 || !selectedProvider || !selectedService || !siteId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      try {
        setLoadingSlots(true);
        setLoadError(null);
        const slots = await searchOpenSlots({
          providerId: selectedProvider.id,
          serviceId: selectedService.id,
          siteId,
          date: selectedDate,
        });
        if (!cancelled) {
          setAvailableSlots(slots.filter((s) => s.status.toLowerCase() === "open"));
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableSlots([]);
          const msg = isAxiosError<{ message?: string }>(error)
            ? error.response?.data?.message
            : undefined;
          setLoadError(msg ?? "Could not fetch slots for selected provider/service/site/date.");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selectedProvider, selectedService, siteId, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedProvider) {
        setProviders(allProviders);
        setServices(allServices);
        setSelectedService(null);
        setSelectedSlot(null);
        return;
      }
      try {
        const mapped = await fetchServicesByProvider(selectedProvider.id);
        if (cancelled) return;
        const serviceIds = new Set(
          mapped
            .filter((m) => (m.status ?? "").toLowerCase() !== "inactive")
            .map((m) => m.serviceId)
        );
        const filtered = allServices.filter((s) => serviceIds.has(s.id));
        setServices(filtered);
        if (!filtered.some((s) => s.id === selectedService?.id)) {
          setSelectedService(null);
          setSelectedSlot(null);
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setSelectedService(null);
          setSelectedSlot(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProvider, allProviders, allServices, selectedService?.id]);

  useEffect(() => {
    if (waitlistPrefillAppliedRef.current) return;
    if (searchParams.get("fromWaitlist") !== "1") return;
    if (patients.length === 0 || allProviders.length === 0 || allServices.length === 0 || sites.length === 0) return;

    waitlistPrefillAppliedRef.current = true;
    const prefillPatient = patients.find((p) => p.userId === prefillPatientId) ?? null;
    if (prefillPatient) {
      setSelectedPatient(prefillPatient);
      setSearchQuery(prefillPatient.name);
      setManualPatientId(null);
    } else if (Number.isInteger(prefillPatientId) && prefillPatientId > 0) {
      setSelectedPatient(null);
      setManualPatientId(prefillPatientId);
      setSearchQuery(String(prefillPatientId));
    }

    if (Number.isInteger(prefillProviderId) && prefillProviderId > 0) {
      const prefillProvider = allProviders.find((p) => p.id === prefillProviderId) ?? null;
      setSelectedProvider(prefillProvider);
    }
    if (Number.isInteger(prefillServiceId) && prefillServiceId > 0) {
      const prefillService = allServices.find((s) => s.id === prefillServiceId) ?? null;
      setSelectedService(prefillService);
    }
    if (Number.isInteger(prefillSiteId) && prefillSiteId > 0 && sites.some((s) => s.siteId === prefillSiteId)) {
      setSiteId(prefillSiteId);
    }
    if (prefillDate) {
      setSelectedDate(prefillDate);
    }

    setStep(3);
    setSubmitMessage("Waitlist details loaded. Continue booking by selecting an open slot.");
  }, [
    searchParams,
    patients,
    allProviders,
    allServices,
    sites,
    prefillPatientId,
    prefillProviderId,
    prefillServiceId,
    prefillSiteId,
    prefillDate,
  ]);

  const filteredPatients = patients.filter((p) =>
    !searchQuery.trim()
      ? true
      : `${p.name} ${p.email} ${p.phone ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canContinueStep1 = selectedPatient != null || manualPatientId != null;
  const canContinueStep2 = selectedProvider != null && selectedService != null && siteId != null;
  const canConfirm = selectedPatient != null && selectedSlot != null;

  const handleContinue = async () => {
    setSubmitMessage(null);
    if (step === 1 && canContinueStep1) {
      setStep(2);
      return;
    }
    if (step === 2 && canContinueStep2) {
      setSelectedSlot(null);
      setStep(3);
      return;
    }
    if (step === 3 && canConfirm && selectedSlot) {
      try {
        const created = await bookAppointment({
          publishedSlotId: selectedSlot.pubSlotId,
          patientId: selectedPatient?.userId ?? manualPatientId ?? 0,
          bookingChannel: "FrontDesk",
        });
        if (selectedService && selectedProvider) {
          const estimatedAmount = Math.max(300, selectedService.duration * 25);
          try {
            await createCharge({
              appointmentId: created.appointmentId,
              serviceId: selectedService.id,
              providerId: selectedProvider.id,
              amount: estimatedAmount,
              currency: "INR",
            });
            const charges = await searchCharges({ appointmentId: created.appointmentId });
            setChargeSummary(
              `Charge linked: ${charges.length} record(s), latest amount INR ${estimatedAmount}.`
            );
          } catch {
            setChargeSummary("Appointment booked, but charge creation failed.");
          }
        }
        if (Number.isInteger(prefillWaitId) && prefillWaitId > 0) {
          await fillWaitlist(prefillWaitId, "FrontDesk");
        }
        setSubmitMessage("Appointment booked successfully. Redirecting to dashboard...");
        setTimeout(() => navigate("/frontdesk"), 700);
      } catch (error) {
        const msg = isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message
          : undefined;
        setSubmitMessage(msg ?? "Booking failed. Please verify selected patient/slot and retry.");
      }
    }
  };

  const handleAddToWaitlist = async () => {
    const patientId = selectedPatient?.userId ?? manualPatientId;
    if (!patientId || !siteId || !selectedProvider || !selectedService || !selectedDate) {
      setSubmitMessage("Select patient, provider, service, site, and date before adding to waitlist.");
      return;
    }

    try {
      await createWaitlist({
        siteId,
        providerId: selectedProvider.id,
        serviceId: selectedService.id,
        patientId,
        priority: "Normal",
        requestedDate: selectedDate,
      });
      setTimeout(() => navigate("/frontdesk/waitlist"), 700);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setSubmitMessage(msg ?? "Could not add patient to waitlist.");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Book New Appointment</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete 3-step booking process</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Patient Info", icon: User },
            { num: 2, label: "Select Provider & Service", icon: Stethoscope },
            { num: 3, label: "Choose Time Slot", icon: Clock },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  step >= s.num 
                    ? "bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] text-white shadow-md" 
                    : "bg-[#f5f0ea] text-muted-foreground"
                }`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className={`text-xs mt-2 font-medium ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
              </div>
              {idx < 2 && (
                <div className={`h-0.5 flex-1 mx-4 transition-all ${step > s.num ? "bg-[#6b9bd1]" : "bg-[#e5dfd8]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Step 1: Patient Information */}
        {step === 1 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium text-foreground mb-1">Patient Information</h3>
              <p className="text-xs text-muted-foreground">Search existing patient or add new</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Search Patient</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      const asNumber = Number(value);
                      if (Number.isInteger(asNumber) && asNumber > 0) {
                        setManualPatientId(asNumber);
                      } else {
                        setManualPatientId(null);
                      }
                    }}
                    placeholder="Search by name, phone, or MR number..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredPatients.slice(0, 8).map((patient) => (
                  <button
                    key={patient.userId}
                    onClick={() => setSelectedPatient(patient)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedPatient?.userId === patient.userId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {patient.email} {patient.phone ? `• ${patient.phone}` : ""}
                    </p>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-xs text-muted-foreground">No patients found. Enter numeric Patient ID manually in search box.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-sm text-muted-foreground">Booking Channel: FrontDesk</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Provider & Service Selection */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Select Site</h3>
              <div className="mb-5">
                <select
                  value={siteId ?? ""}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSiteId(Number.isFinite(value) && value > 0 ? value : null);
                    setSelectedSlot(null);
                    setSubmitMessage(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Select Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSelectedProvider(provider);
                      setSelectedService(null);
                      setSelectedSlot(null);
                      setSubmitMessage(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedProvider?.id === provider.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{provider.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{provider.specialty}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Select Service</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setSelectedSlot(null);
                      setSubmitMessage(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedService?.id === service.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                  </button>
                ))}
                {services.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active services mapped to selected provider.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Time Slot Selection */}
        {step === 3 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium text-foreground mb-1">Choose Appointment Time</h3>
              <p className="text-xs text-muted-foreground">Available slots for selected provider and service</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">Available Time Slots</label>
              {loadingSlots && <p className="text-xs text-muted-foreground mb-3">Loading slots...</p>}
              <div className="grid grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.pubSlotId}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      selectedSlot?.pubSlotId === slot.pubSlotId
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {slot.startTime} - {slot.endTime}
                  </button>
                ))}
              </div>
              {!loadingSlots && availableSlots.length === 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  No open slots for selected provider/service/date.
                </p>
              )}
              {!loadingSlots && availableSlots.length === 0 && selectedProvider && selectedService && (
                <button
                  onClick={handleAddToWaitlist}
                  className="mt-3 px-3 py-2 text-sm rounded border border-border hover:bg-secondary"
                >
                  Add to Waitlist
                </button>
              )}
            </div>

            {selectedSlot && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#95d4a8]/5 border border-[#95d4a8]/30">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-[#95d4a8] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Booking Summary</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Patient:</span> <span className="font-medium">{selectedPatient?.name ?? "Not selected"}</span></p>
                      <p><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{(reviewProviderName ?? selectedProvider?.name) || "Dr. Rajesh Kumar"}</span></p>
                      <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{(reviewServiceName ?? selectedService?.name) || "Cardiology Consultation"}</span></p>
                      <p><span className="text-muted-foreground">Site:</span> <span className="font-medium">{reviewSiteName ?? "Unknown Site"}</span></p>
                      <p><span className="text-muted-foreground">Date & Time:</span> <span className="font-medium">{selectedSlot.slotDate} at {selectedSlot.startTime}</span></p>
                    </div>
                    <button
                      className="mt-2 px-2 py-1 rounded border border-border text-xs"
                      onClick={async () => {
                        if (selectedProvider) {
                          const provider = await getProviderById(selectedProvider.id);
                          setReviewProviderName(provider.name);
                        }
                        if (selectedService) {
                          const service = await getServiceById(selectedService.id);
                          setReviewServiceName(service.name);
                        }
                        if (siteId) {
                          const site = await getSiteById(siteId);
                          setReviewSiteName(site.name);
                        }
                      }}
                    >
                      Refresh by ID
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 rounded-lg border-2 border-border text-sm font-medium text-foreground hover:bg-secondary transition-all"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canConfirm)}
            className="flex-1 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all flex items-center justify-center gap-2"
          >
            {step === 3 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Booking
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {submitMessage && (
          <p className={`mt-3 text-sm ${submitMessage.includes("successfully") ? "text-emerald-600" : "text-destructive"}`}>
            {submitMessage}
          </p>
        )}
        {chargeSummary && <p className="mt-2 text-sm text-muted-foreground">{chargeSummary}</p>}
      </div>
    </div>
  );
}
