import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Calendar, Users, Clock, AlertCircle, Plus, Search } from "lucide-react";
import { markAppointmentCheckedIn, searchAppointments, searchWaitlist, type AppointmentDto, type WaitlistDto } from "../../api/appointmentsApi";
import { fetchProviders, fetchServices } from "../../api/masterdataApi";
import { fetchUsers } from "../../api/usersApi";

export default function FrontDeskDashboard() {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [list, wait, users, providers, services] = await Promise.all([
          searchAppointments({ date: today }),
          searchWaitlist(),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
          fetchServices(),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setWaitlist(wait);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setWaitlist([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments = appointments.map((apt) => ({
    id: apt.appointmentId,
    patientName: userNames.get(apt.patientId) ?? "Unknown Patient",
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    time: apt.startTime,
    status: apt.status,
  }));
  const checkedInCount = todayAppointments.filter(apt => apt.status === "CheckedIn").length;
  const pendingCheckin = todayAppointments.filter(apt => apt.status === "Booked").length;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Front Desk Dashboard" userName="Amit Patel" userRole="Front Desk Officer" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Appointments"
            value={todayAppointments.length}
            icon={Calendar}
            color="bg-[#f5e6d3]/40"
            subtitle="All providers"
          />
          <StatCard
            title="Checked In"
            value={checkedInCount}
            icon={Users}
            color="bg-[#c4f0d4]/30"
            subtitle="Currently in clinic"
          />
          <StatCard
            title="Pending Check-in"
            value={pendingCheckin}
            icon={Clock}
            color="bg-[#a8c4d4]/20"
            subtitle="Awaiting arrival"
          />
          <StatCard
            title="Waitlist"
            value={waitlist.length}
            icon={AlertCircle}
            color="bg-[#f5d4c4]/30"
            subtitle="Pending slots"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-5 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search patients, appointments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Book Appointment
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border">
              <div className="border-b border-border p-5">
                <h3 className="text-sm font-medium text-foreground">Today's Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Monday, March 30, 2026</p>
              </div>
              <div className="p-5">
                <div className="space-y-2">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-primary-foreground bg-primary/20 px-2 py-1 rounded">
                            {apt.time}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {apt.service} • {apt.provider}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            apt.status === "CheckedIn"
                              ? "bg-[#c4f0d4]/30 text-foreground"
                              : apt.status === "Completed"
                              ? "bg-[#a8c4d4]/30 text-foreground"
                              : "bg-[#f5e6d3]/50 text-foreground"
                          }`}
                        >
                          {apt.status}
                        </span>
                        {apt.status === "Booked" && (
                          <button
                            onClick={async () => {
                              await markAppointmentCheckedIn(apt.id);
                              const today = new Date().toISOString().slice(0, 10);
                              setAppointments(await searchAppointments({ date: today }));
                            }}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#f5e6d3]/40 hover:bg-[#f5e6d3]/60 transition-colors">
                  <p className="text-sm font-medium text-foreground">Walk-in Registration</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#a8c4d4]/10 hover:bg-[#a8c4d4]/20 transition-colors">
                  <p className="text-sm font-medium text-foreground">Reschedule</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#d4c4f0]/10 hover:bg-[#d4c4f0]/20 transition-colors">
                  <p className="text-sm font-medium text-foreground">Cancel Appointment</p>
                </button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-[#f5d4c4]/20 hover:bg-[#f5d4c4]/30 transition-colors">
                  <p className="text-sm font-medium text-foreground">View Queue</p>
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Waitlist</h3>
              <div className="space-y-2">
                {waitlist.map((item) => (
                  <div key={item.waitId} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">{userNames.get(item.patientId) ?? "Unknown Patient"}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          item.priority === "High"
                            ? "bg-[#f4a6a6]/30 text-foreground"
                            : "bg-[#a8c4d4]/20 text-foreground"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{serviceNames.get(item.serviceId) ?? "Unknown Service"}</p>
                    <p className="text-xs text-muted-foreground">Requested: {item.requestedDate}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg">
            <h3 className="text-base font-medium text-foreground mb-4">Book New Appointment</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Patient Name</label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Provider</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Dr. Rajesh Kumar - Cardiology</option>
                  <option>Dr. Priya Sharma - Pediatrics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Service</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Cardiology Consultation</option>
                  <option>ECG Test</option>
                  <option>Pediatric Checkup</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Time Slot</label>
                  <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>10:00 AM</option>
                    <option>11:00 AM</option>
                    <option>02:00 PM</option>
                    <option>03:00 PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Site</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Apollo Clinic - Bangalore</option>
                  <option>Apollo Clinic - Mumbai</option>
                  <option>Apollo Clinic - Delhi</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
