import { useEffect, useMemo, useState } from "react";
import { User, Activity, Heart, Thermometer, Droplet, Clock, CheckCircle2, Plus } from "lucide-react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { fetchProviders, fetchServices, fetchSites } from "../../../api/masterdataApi";
import { fetchUsers } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  patientName: string;
  service: string;
  status: string;
  provider: string;
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

export default function StaffPatients() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [siteNames, setSiteNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [list, users, providers, services, sites] = await Promise.all([
          searchAppointments({ date: today }),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
          fetchServices(),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setPatientNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        setSiteNames(new Map(sites.map((s) => [s.siteId, s.name])));
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments = useMemo<AppointmentRow[]>(
    () =>
      appointments.map((apt) => ({
        id: apt.appointmentId,
        patientName: patientNames.get(apt.patientId) ?? `Patient #${apt.patientId}`,
        service: serviceNames.get(apt.serviceId) ?? `Service #${apt.serviceId}`,
        status: apt.status,
        provider: providerNames.get(apt.providerId) ?? `Provider #${apt.providerId}`,
        time: to12Hour(apt.startTime),
        site: siteNames.get(apt.siteId) ?? `Site #${apt.siteId}`,
      })),
    [appointments, patientNames, providerNames, serviceNames, siteNames]
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case "CheckedIn": return { bg: "bg-[#6b9bd1]/20", text: "text-[#5a8bc1]", icon: Activity };
      case "InRoom": return { bg: "bg-[#a68fcf]/20", text: "text-[#9478bf]", icon: Heart };
      case "Completed": return { bg: "bg-[#95d4a8]/20", text: "text-[#75b488]", icon: CheckCircle2 };
      default: return { bg: "bg-[#f0b895]/20", text: "text-[#d89768]", icon: Clock };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Patient Care</h1>
        <p className="text-sm text-muted-foreground mt-1">Today's patient workflow and vitals tracking</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/30">
          <p className="text-sm text-muted-foreground mb-1">Total Patients</p>
          <p className="text-2xl font-medium text-foreground">{todayAppointments.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#a68fcf]/10 to-[#9478bf]/5 border border-[#a68fcf]/30">
          <p className="text-sm text-muted-foreground mb-1">In Progress</p>
          <p className="text-2xl font-medium text-foreground">{todayAppointments.filter(a => a.status === "CheckedIn").length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#75b488]/5 border border-[#95d4a8]/30">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-medium text-foreground">{todayAppointments.filter(a => a.status === "Completed").length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/30">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-medium text-foreground">{todayAppointments.filter(a => a.status === "Booked").length}</p>
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {todayAppointments.map((apt) => {
          const colors = getStatusColor(apt.status);
          const StatusIcon = colors.icon;
          
          return (
            <div key={apt.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Patient Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-white" />
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-medium text-foreground mb-1">{apt.patientName}</h3>
                        <p className="text-sm text-muted-foreground">{apt.service}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${colors.bg} ${colors.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {apt.status}
                      </span>
                    </div>

                    {/* Appointment Details */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Provider</p>
                        <p className="text-sm font-medium text-foreground">{apt.provider}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Time</p>
                        <p className="text-sm font-medium text-foreground">{apt.time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Site</p>
                        <p className="text-sm font-medium text-foreground">{apt.site.split(" - ")[1] ?? apt.site}</p>
                      </div>
                    </div>

                    {/* Vitals Section (if checked in) */}
                    {apt.status === "CheckedIn" && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-[#f5f0ea] to-[#faf8f5] border border-border mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-foreground">Vitals</p>
                          <button
                            onClick={() => {
                              setSelectedPatient(apt);
                              setShowVitalsModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-xs font-medium hover:shadow-md transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Record Vitals
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-card">
                            <div className="flex items-center gap-2 mb-1">
                              <Heart className="w-4 h-4 text-[#e8a0a0]" />
                              <p className="text-xs text-muted-foreground">BP</p>
                            </div>
                            <p className="text-sm font-medium text-foreground">-/-</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <div className="flex items-center gap-2 mb-1">
                              <Activity className="w-4 h-4 text-[#6b9bd1]" />
                              <p className="text-xs text-muted-foreground">Pulse</p>
                            </div>
                            <p className="text-sm font-medium text-foreground">-</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <div className="flex items-center gap-2 mb-1">
                              <Thermometer className="w-4 h-4 text-[#f0b895]" />
                              <p className="text-xs text-muted-foreground">Temp</p>
                            </div>
                            <p className="text-sm font-medium text-foreground">-°F</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <div className="flex items-center gap-2 mb-1">
                              <Droplet className="w-4 h-4 text-[#a68fcf]" />
                              <p className="text-xs text-muted-foreground">SpO2</p>
                            </div>
                            <p className="text-sm font-medium text-foreground">-%</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {apt.status === "Booked" && (
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all">
                          Pre-Appointment Setup
                        </button>
                      )}
                      {apt.status === "CheckedIn" && (
                        <>
                          <button className="px-4 py-2 rounded-lg bg-[#a68fcf] text-white text-sm font-medium hover:shadow-md transition-all">
                            Move to Room
                          </button>
                          <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all">
                            View History
                          </button>
                        </>
                      )}
                      {apt.status === "Completed" && (
                        <div className="flex items-center gap-2 text-[#95d4a8]">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">Care Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Vitals Modal */}
      {showVitalsModal && selectedPatient && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Record Vitals - {selectedPatient.patientName}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Blood Pressure</label>
                  <input 
                    type="text" 
                    placeholder="120/80"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pulse (bpm)</label>
                  <input 
                    type="number" 
                    placeholder="72"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Temperature (°F)</label>
                  <input 
                    type="number" 
                    placeholder="98.6"
                    step="0.1"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SpO2 (%)</label>
                  <input 
                    type="number" 
                    placeholder="98"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <textarea 
                  rows={3}
                  placeholder="Any observations or concerns..."
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowVitalsModal(false);
                  setSelectedPatient(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVitalsModal(false);
                  setSelectedPatient(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
              >
                Save Vitals
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
