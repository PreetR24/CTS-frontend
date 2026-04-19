import { useEffect, useState } from "react";
import { User, Stethoscope, Clock, CheckCircle, Search, ArrowRight } from "lucide-react";
import { fetchProviders, fetchServices } from "../../../api/masterdataApi";
import { mapServiceRow, type AdminServiceRow } from "../../../api/adminViewMappers";

type BookingProvider = { id: number; name: string; specialty: string };

export default function FrontDeskBooking() {
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<BookingProvider | null>(null);
  const [selectedService, setSelectedService] = useState<AdminServiceRow | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const [provList, svcList] = await Promise.all([fetchProviders(), fetchServices()]);
        if (cancelled) return;
        setProviders(
          provList.map((p) => ({
            id: p.providerId,
            name: p.name,
            specialty: p.specialty?.trim() || "—",
          }))
        );
        setServices(svcList.map(mapServiceRow));
      } catch {
        if (!cancelled) setLoadError("Could not load providers or services.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableSlots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"];

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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, or MR number..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Rajesh Patel"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Age</label>
                  <input
                    type="number"
                    placeholder="35"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Visit Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {["New Visit", "Follow-up", "Emergency"].map((type) => (
                    <button
                      key={type}
                      className="px-4 py-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Provider & Service Selection */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Select Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider)}
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
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedService?.id === service.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-md bg-[#95d4a8]/20 text-foreground">
                        {service.duration} min
                      </span>
                      <span className="text-xs text-muted-foreground">• {service.visitType}</span>
                    </div>
                  </button>
                ))}
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
                defaultValue="2026-03-31"
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">Available Time Slots</label>
              <div className="grid grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      selectedSlot === slot
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {selectedSlot && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#95d4a8]/5 border border-[#95d4a8]/30">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-[#95d4a8] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Booking Summary</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Patient:</span> <span className="font-medium">New Patient</span></p>
                      <p><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{selectedProvider?.name || "Dr. Rajesh Kumar"}</span></p>
                      <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{selectedService?.name || "Cardiology Consultation"}</span></p>
                      <p><span className="text-muted-foreground">Date & Time:</span> <span className="font-medium">Mar 31, 2026 at {selectedSlot}</span></p>
                    </div>
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
            onClick={() => step < 3 ? setStep(step + 1) : null}
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
      </div>
    </div>
  );
}
