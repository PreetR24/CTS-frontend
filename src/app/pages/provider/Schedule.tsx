import { Calendar, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchAppointments } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";

type ScheduleRow = {
  date: string;
  site: string;
  time: string;
  status: string;
};

export default function ProviderSchedule() {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!me.userId) {
          if (!cancelled) setSchedule([]);
          return;
        }
        const appointments = await searchAppointments({ providerId: me.userId });
        if (cancelled) return;
        const rows: ScheduleRow[] = appointments
          .map((apt) => ({
            date: apt.slotDate,
            site: apt.siteName?.trim() || `Site ${apt.siteId}`,
            time: `${apt.startTime} - ${apt.endTime}`,
            status: apt.status,
          }))
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

        setSchedule(rows);
      } catch {
        if (!cancelled) setSchedule([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSchedule = useMemo(
    () => schedule.filter((s) => statusFilter === "All" || s.status === statusFilter),
    [schedule, statusFilter]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Appointment schedule across all sites</p>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
          <option>All</option>
          <option>Booked</option>
          <option>CheckedIn</option>
          <option>Completed</option>
          <option>NoShow</option>
          <option>Cancelled</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="space-y-2">
          {filteredSchedule.map((row, index) => (
            <div key={index} className="p-3 rounded-lg bg-[#7ba3c0]/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" />
                <span>{row.date}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                <span>{row.time}</span>
              </div>
              <p className="text-xs text-muted-foreground">{row.site}</p>
              <p className="text-xs font-medium text-foreground mt-1">{row.status}</p>
            </div>
          ))}
          {filteredSchedule.length === 0 && (
            <p className="text-sm text-muted-foreground">No schedule rows found.</p>
          )}
            </div>
      </div>
      </div>
  );
}
