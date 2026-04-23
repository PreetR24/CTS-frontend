import { useEffect, useState } from "react";
import { Clock, User, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { isAxiosError } from "axios";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import {
  assignCheckInRoom,
  createCheckIn,
  searchCheckIns,
  type CheckInDto,
} from "../../../api/checkinsApi";
import { fetchProviders, fetchRooms, fetchServices, type RoomDto } from "../../../api/masterdataApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type AppointmentRow = {
  id: number;
  providerId: number;
  patientName: string;
  provider: string;
  service: string;
  date: string;
  time: string;
  appointmentStatus: string;
};

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export default function FrontDeskQueue() {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [providerNames, setProviderNames] = useState<Map<number, string>>(new Map());
  const [serviceNames, setServiceNames] = useState<Map<number, string>>(new Map());
  const [checkInsByAppointment, setCheckInsByAppointment] = useState<Map<number, CheckInDto>>(new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const [roomAssignAppointmentId, setRoomAssignAppointmentId] = useState<number | null>(null);
  const [roomAssignValue, setRoomAssignValue] = useState("");
  const [roomOptions, setRoomOptions] = useState<RoomDto[]>([]);
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [list, users, providers, services, checkIns] = await Promise.all([
          searchAppointments({ date: today }),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchProviders(),
          fetchServices(),
          searchCheckIns(),
        ]);
        if (cancelled) return;
        setAppointments(list);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setProviderNames(new Map(providers.map((p) => [p.providerId, p.name])));
        setServiceNames(new Map(services.map((s) => [s.serviceId, s.name])));
        setCheckInsByAppointment(new Map(checkIns.map((c) => [c.appointmentId, c])));
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayAppointments: AppointmentRow[] = appointments.map((apt) => ({
    id: apt.appointmentId,
    providerId: apt.providerId,
    patientName: userNames.get(apt.patientId) ?? "Unknown Patient",
    provider: providerNames.get(apt.providerId) ?? "Unknown Provider",
    service: serviceNames.get(apt.serviceId) ?? "Unknown Service",
    date: apt.slotDate,
    time: to12Hour(apt.startTime),
    appointmentStatus: apt.status,
  }));
  const normalizeQueueStatus = (raw: string): string => {
    const s = raw.trim().toLowerCase().replace(/[\s_-]/g, "");
    if (s === "booked") return "Booked";
    // Backend creates check-in row with status "Waiting" after successful check-in.
    // In queue pipeline this stage should allow room assignment.
    if (s === "waiting" || s === "checkedin") return "CheckedIn";
    // Keep RoomAssigned as part of CheckedIn stage in UI (no extra stage shown).
    if (s === "roomassigned") return "CheckedIn";
    if (s === "inroom") return "InRoom";
    if (s === "withprovider" || s === "inprogress") return "WithProvider";
    if (s === "completed") return "Completed";
    return raw;
  };
  const getQueueStatus = (apt: AppointmentRow): string =>
    normalizeQueueStatus(checkInsByAppointment.get(apt.id)?.status ?? apt.appointmentStatus);
  
  const statusCounts = {
    all: todayAppointments.length,
    waiting: todayAppointments.filter((apt) => getQueueStatus(apt) === "Booked").length,
    checkedIn: todayAppointments.filter((apt) => getQueueStatus(apt) === "CheckedIn").length,
    inProgress: todayAppointments.filter((apt) => getQueueStatus(apt) === "InRoom" || getQueueStatus(apt) === "WithProvider").length,
    completed: todayAppointments.filter((apt) => getQueueStatus(apt) === "Completed").length,
  };

  const filteredAppointments = selectedStatus === "All" 
    ? todayAppointments 
    : todayAppointments.filter((apt) => {
      const status = getQueueStatus(apt);
      if (selectedStatus === "CheckedIn") return status === "CheckedIn";
      if (selectedStatus === "InProgress") return status === "InRoom" || status === "WithProvider";
      return status === selectedStatus;
    });
  const providerFilteredAppointments =
    selectedProviderFilter === "all"
      ? filteredAppointments
      : filteredAppointments.filter((apt) => String(apt.providerId) === selectedProviderFilter);
  const searchedAppointments = providerFilteredAppointments.filter((apt) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    const queueStatus = getQueueStatus(apt).toLowerCase();
    return (
      apt.patientName.toLowerCase().includes(q) ||
      apt.provider.toLowerCase().includes(q) ||
      apt.service.toLowerCase().includes(q) ||
      apt.time.toLowerCase().includes(q) ||
      queueStatus.includes(q)
    );
  });

  const handleCheckIn = async (appointmentId: number) => {
    try {
      setNotice(null);
      await createCheckIn(appointmentId);
      const today = new Date().toISOString().slice(0, 10);
      const [refreshed, checkIns] = await Promise.all([searchAppointments({ date: today }), searchCheckIns()]);
      setAppointments(refreshed);
      setCheckInsByAppointment(new Map(checkIns.map((c) => [c.appointmentId, c])));
      setNotice("Patient checked in.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not check in patient.");
    }
  };

  const handleAssignRoom = async (appointmentId: number) => {
    const checkIn = checkInsByAppointment.get(appointmentId);
    if (!checkIn) return;
    const roomId = Number(roomAssignValue);
    if (!roomId) {
      setNotice("Please select a room.");
      return;
    }
    try {
      setNotice(null);
      await assignCheckInRoom(checkIn.checkInId, roomId);
      const checkIns = await searchCheckIns();
      setCheckInsByAppointment(new Map(checkIns.map((c) => [c.appointmentId, c])));
      setRoomAssignAppointmentId(null);
      setRoomAssignValue("");
      setNotice("Room assigned.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not assign room.");
    }
  };

  const openAssignRoomModal = async (appointmentId: number) => {
    setRoomAssignAppointmentId(appointmentId);
    setRoomAssignValue("");
    const appointment = appointments.find((a) => a.appointmentId === appointmentId);
    if (!appointment?.siteId) {
      setRoomOptions([]);
      return;
    }
    try {
      const rooms = await fetchRooms({ siteId: appointment.siteId, status: "Active", page: 1, pageSize: 200 });
      setRoomOptions(rooms.filter((r) => r.status === "Active"));
      if (rooms[0]) setRoomAssignValue(String(rooms[0].roomId));
    } catch {
      setRoomOptions([]);
    }
  };

  const closeAssignRoomModal = () => setRoomAssignAppointmentId(null);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Booked": return { bg: "bg-[#f0b895]/20", text: "text-[#d89768]", border: "border-[#f0b895]/40" };
      case "CheckedIn": return { bg: "bg-[#6b9bd1]/20", text: "text-[#5a8bc1]", border: "border-[#6b9bd1]/40" };
      case "InRoom": return { bg: "bg-[#a68fcf]/20", text: "text-[#9478bf]", border: "border-[#a68fcf]/40" };
      case "WithProvider": return { bg: "bg-[#a68fcf]/20", text: "text-[#9478bf]", border: "border-[#a68fcf]/40" };
      case "Completed": return { bg: "bg-[#95d4a8]/20", text: "text-[#75b488]", border: "border-[#95d4a8]/40" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Queue Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time patient flow and status</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <button
          onClick={() => setSelectedStatus("All")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "All" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          <Activity className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.all}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Today</p>
        </button>
        
        <button
          onClick={() => setSelectedStatus("Booked")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "Booked" ? "border-[#f0b895] bg-[#f0b895]/5" : "border-border hover:border-[#f0b895]/30"
          }`}
        >
          <Clock className="w-5 h-5 text-[#d89768] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.waiting}</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting</p>
        </button>

        <button
          onClick={() => setSelectedStatus("CheckedIn")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "CheckedIn" ? "border-[#6b9bd1] bg-[#6b9bd1]/5" : "border-border hover:border-[#6b9bd1]/30"
          }`}
        >
          <User className="w-5 h-5 text-[#5a8bc1] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.checkedIn}</p>
          <p className="text-xs text-muted-foreground mt-1">Checked In</p>
        </button>

        <button
          onClick={() => setSelectedStatus("InProgress")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "InProgress" ? "border-[#a68fcf] bg-[#a68fcf]/5" : "border-border hover:border-[#a68fcf]/30"
          }`}
        >
          <AlertCircle className="w-5 h-5 text-[#9478bf] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.inProgress || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">In Progress</p>
        </button>

        <button
          onClick={() => setSelectedStatus("Completed")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selectedStatus === "Completed" ? "border-[#95d4a8] bg-[#95d4a8]/5" : "border-border hover:border-[#95d4a8]/30"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-[#75b488] mb-2" />
          <p className="text-2xl font-medium text-foreground">{statusCounts.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </button>
      </div>

      {/* Queue List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Patient Queue</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchedAppointments.length} {selectedStatus === "All" ? "total" : selectedStatus.toLowerCase()} appointments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search patient, provider, service, status"
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[280px]"
              />
              <select
                value={selectedProviderFilter}
                onChange={(e) => setSelectedProviderFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Providers</option>
                {Array.from(new Set(appointments.map((a) => a.providerId))).map((providerId) => (
                  <option key={providerId} value={String(providerId)}>
                    {providerNames.get(providerId) ?? `Provider ${providerId}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {searchedAppointments.map((apt, index) => {
            const queueStatus = getQueueStatus(apt);
            const colors = getStatusColor(queueStatus);
            const tokenNo = checkInsByAppointment.get(apt.id)?.tokenNo;
            const assignedRoom = checkInsByAppointment.get(apt.id)?.roomAssigned;
            return (
              <div key={apt.id} className="p-5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Token Number */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-white/80">Token</p>
                        <p className="text-xs font-bold text-white">{tokenNo ?? `#${index + 1}`}</p>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-medium text-foreground">{apt.patientName}</p>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {queueStatus}
                        </span>
                        {assignedRoom && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-foreground">
                            Room {assignedRoom}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{apt.service}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {apt.provider}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    {queueStatus === "Booked" && (
                      <button
                        onClick={() => handleCheckIn(apt.id)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
                      >
                        Check In
                      </button>
                    )}
                    {queueStatus === "CheckedIn" && (
                      <>
                        {!assignedRoom ? (
                          <button
                            onClick={() => void openAssignRoomModal(apt.id)}
                            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
                          >
                            Assign Room
                          </button>
                        ) : (
                          <span className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm">
                            Room assigned
                          </span>
                        )}
                      </>
                    )}
                    {queueStatus === "Completed" && (
                      <CheckCircle2 className="w-8 h-8 text-[#95d4a8]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {searchedAppointments.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No queue records match your filter.</div>
          )}
        </div>
      </div>
      {roomAssignAppointmentId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Assign Room</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Room</label>
            <select
              value={roomAssignValue}
              onChange={(e) => setRoomAssignValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select room</option>
              {roomOptions.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {room.roomName} ({room.roomType})
                </option>
              ))}
            </select>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeAssignRoomModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignRoom(roomAssignAppointmentId)}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
