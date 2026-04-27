
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Clock, Heart } from "lucide-react";
import { isAxiosError } from "axios";
import {
  moveCheckInToRoom,
  searchCheckIns,
  setCheckInWithProvider,
  type CheckInDto,
  updateCheckInStatus,
} from "../../../api/checkinsApi";

type QueueRow = {
  checkInId: number;
  appointmentId: number;
  tokenNo: string;
  roomAssigned: number | null;
  status: string;
  checkInTime: string;
};

function toLocalDateTime(value: string): string {
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return value;
  return asDate.toLocaleString();
}

function normalizeQueueStatus(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (s === "waiting" || s === "checkedin") return "CheckedIn";
  if (s === "roomassigned") return "RoomAssigned";
  if (s === "inroom") return "InRoom";
  if (s === "withprovider" || s === "inprogress") return "WithProvider";
  if (s === "completed") return "Completed";
  return raw;
}

export default function NursePatients() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const refreshQueueData = async () => {
    const checkIns = await searchCheckIns();
    setRows(
      checkIns.map((c: CheckInDto) => ({
        checkInId: c.checkInId,
        appointmentId: c.appointmentId,
        tokenNo: c.tokenNo ?? "—",
        roomAssigned: c.roomAssigned,
        status: normalizeQueueStatus(c.status),
        checkInTime: c.checkInTime,
      }))
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const checkIns = await searchCheckIns();
        if (cancelled) return;
        setRows(
          checkIns.map((c: CheckInDto) => ({
            checkInId: c.checkInId,
            appointmentId: c.appointmentId,
            tokenNo: c.tokenNo ?? "—",
            roomAssigned: c.roomAssigned,
            status: normalizeQueueStatus(c.status),
            checkInTime: c.checkInTime,
          }))
        );
      } catch (error) {
        const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
        if (!cancelled) {
          setRows([]);
          setNotice(msg ?? "Could not load nurse queue.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMoveToRoom = async (checkInId: number) => {
    try {
      setNotice(null);
      await moveCheckInToRoom(checkInId);
      await refreshQueueData();
      setNotice("Patient moved to room.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not move patient to room.");
    }
  };

  const handleWithProvider = async (checkInId: number) => {
    try {
      setNotice(null);
      await setCheckInWithProvider(checkInId);
      await refreshQueueData();
      setNotice("Patient sent to provider.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not start provider stage.");
    }
  };

  const handleComplete = async (checkInId: number) => {
    try {
      setNotice(null);
      await updateCheckInStatus(checkInId, "Completed");
      await refreshQueueData();
      setNotice("Visit marked completed.");
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not complete visit.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CheckedIn":
      case "RoomAssigned":
        return { bg: "bg-[#6b9bd1]/20", text: "text-[#5a8bc1]", icon: Activity };
      case "InRoom":
        return { bg: "bg-[#a68fcf]/20", text: "text-[#9478bf]", icon: Heart };
      case "Completed":
        return { bg: "bg-[#95d4a8]/20", text: "text-[#75b488]", icon: CheckCircle2 };
      default:
        return { bg: "bg-[#f0b895]/20", text: "text-[#d89768]", icon: Clock };
    }
  };

  const filteredRows =
    statusFilter === "All" ? rows : rows.filter((r) => r.status === statusFilter);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Nurse Patient Care</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FrontDesk flow continuation: RoomAssigned -&gt; InRoom -&gt; WithProvider -&gt; Completed
        </p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="mb-4 bg-card rounded-xl border border-border p-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">Filter by status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-72 px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        >
          <option value="All">All</option>
          <option value="CheckedIn">Checked In</option>
          <option value="RoomAssigned">Room Assigned</option>
          <option value="InRoom">In Room</option>
          <option value="WithProvider">With Provider</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/30">
          <p className="text-sm text-muted-foreground mb-1">Total Check-ins</p>
          <p className="text-2xl font-medium text-foreground">{filteredRows.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#a68fcf]/10 to-[#9478bf]/5 border border-[#a68fcf]/30">
          <p className="text-sm text-muted-foreground mb-1">Room Assigned</p>
          <p className="text-2xl font-medium text-foreground">{filteredRows.filter((a) => a.status === "RoomAssigned").length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#75b488]/5 border border-[#95d4a8]/30">
          <p className="text-sm text-muted-foreground mb-1">With Provider</p>
          <p className="text-2xl font-medium text-foreground">{filteredRows.filter((a) => a.status === "WithProvider").length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/30">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-medium text-foreground">{filteredRows.filter((a) => a.status === "Completed").length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No check-ins found for selected status.
          </div>
        ) : (
          filteredRows.map((row) => {
            const colors = getStatusColor(row.status);
            const StatusIcon = colors.icon;
            return (
              <div key={row.checkInId} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-medium text-foreground">Appointment #{row.appointmentId}</h3>
                      <p className="text-sm text-muted-foreground">CheckIn #{row.checkInId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${colors.bg} ${colors.text}`}>
                      <StatusIcon className="w-3 h-3" />
                      {row.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Token</p>
                      <p className="text-sm font-medium text-foreground">{row.tokenNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Room</p>
                      <p className="text-sm font-medium text-foreground">{row.roomAssigned ?? "Not assigned yet"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Check-in Time</p>
                      <p className="text-sm font-medium text-foreground">{toLocalDateTime(row.checkInTime)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {row.status === "RoomAssigned" && (
                      <button
                        onClick={() => void handleMoveToRoom(row.checkInId)}
                        className="px-4 py-2 rounded-lg bg-[#a68fcf] text-white text-sm font-medium hover:shadow-md transition-all"
                      >
                        Move To In-Room
                      </button>
                    )}
                    {row.status === "InRoom" && (
                      <button
                        onClick={() => void handleWithProvider(row.checkInId)}
                        className="px-4 py-2 rounded-lg bg-[#95d4a8] text-white text-sm font-medium hover:shadow-md transition-all"
                      >
                        Start Provider
                      </button>
                    )}
                    {row.status === "WithProvider" && (
                      <button
                        onClick={() => void handleComplete(row.checkInId)}
                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
                      >
                        Complete
                      </button>
                    )}
                    {row.status === "Completed" && (
                      <div className="flex items-center gap-2 text-[#95d4a8]">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">Care Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
