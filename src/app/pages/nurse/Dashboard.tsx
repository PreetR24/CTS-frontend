
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/StatCard";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { meApi } from "../../../api/authApi";
import { searchCheckIns, type CheckInDto } from "../../../api/checkinsApi";

type CheckInRow = {
  id: number;
  appointmentId: number;
  tokenNo: string;
  status: string;
  checkInTime: string;
};

function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (s === "waiting" || s === "checkedin") return "CheckedIn";
  if (s === "roomassigned") return "RoomAssigned";
  if (s === "inroom") return "InRoom";
  if (s === "withprovider" || s === "inprogress") return "WithProvider";
  if (s === "completed") return "Completed";
  return raw;
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [checkIns, setCheckIns] = useState<CheckInDto[]>([]);
  const [nurseName, setNurseName] = useState("Nurse");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, list] = await Promise.all([meApi(), searchCheckIns()]);
        if (cancelled) return;
        setNurseName(me.name);
        setCheckIns(list);
      } catch {
        if (!cancelled) {
          setCheckIns([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const queueRows: CheckInRow[] = checkIns.map((row) => ({
    id: row.checkInId,
    appointmentId: row.appointmentId,
    tokenNo: row.tokenNo ?? "—",
    status: normalizeStatus(row.status),
    checkInTime: row.checkInTime,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Nurse Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{nurseName}, here is your live care queue overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Checked In" value={queueRows.filter((q) => q.status === "CheckedIn").length} icon={Users} color="bg-[#7ba3c0]/20" subtitle="Waiting for nurse flow" />
        <StatCard title="Room Assigned" value={queueRows.filter((q) => q.status === "RoomAssigned").length} icon={Clock} color="bg-[#a9d4b8]/30" subtitle="Assigned by front desk" />
        <StatCard title="In Room / With Provider" value={queueRows.filter((q) => q.status === "InRoom" || q.status === "WithProvider").length} icon={Calendar} color="bg-[#c4b5e8]/20" subtitle="Active care stage" />
        <StatCard title="Completed" value={queueRows.filter((q) => q.status === "Completed").length} icon={CheckCircle} color="bg-[#e8c9a9]/30" subtitle="Visit completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Live Queue Status</h3>
          <div className="space-y-2">
            {queueRows.slice(0, 8).map((row) => (
              <div key={row.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Appt #{row.appointmentId}</span>
                  <span className="px-2 py-1 rounded-md bg-[#a9d4b8]/30 text-xs text-foreground">{row.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Token: {row.tokenNo}</p>
                <p className="text-xs text-muted-foreground">Check-in: {new Date(row.checkInTime).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Today's Tasks</h3>
          <div className="space-y-2">
            <button onClick={() => navigate("/nurse/queue")} className="w-full text-left p-4 rounded-lg bg-[#a9d4b8]/10 border border-border hover:bg-[#a9d4b8]/20">
              <p className="text-sm font-medium text-foreground">Continue Patient Care Queue</p>
            </button>
            <button onClick={() => navigate("/nurse/rooms")} className="w-full text-left p-4 rounded-lg bg-[#a9d4b8]/10 border border-border hover:bg-[#a9d4b8]/20">
              <p className="text-sm font-medium text-foreground">Review Room Occupancy</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
