import { Calendar, Clock, MapPin, Activity } from "lucide-react";
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
  const [dateFilter, setDateFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("All");

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
    () =>
      schedule.filter(
        (s) =>
          (statusFilter === "All" || s.status === statusFilter) &&
          (!dateFilter || s.date === dateFilter) &&
          (siteFilter === "All" || s.site === siteFilter)
      ),
    [schedule, statusFilter, dateFilter, siteFilter]
  );
  const uniqueSites = useMemo(
    () => Array.from(new Set(schedule.map((s) => s.site))).sort((a, b) => a.localeCompare(b)),
    [schedule]
  );
  const statCards = useMemo(() => {
    const total = filteredSchedule.length;
    const booked = filteredSchedule.filter((s) => s.status === "Booked" || s.status === "CheckedIn").length;
    const completed = filteredSchedule.filter((s) => s.status === "Completed").length;
    const cancelled = filteredSchedule.filter((s) => s.status === "Cancelled" || s.status === "NoShow").length;
    return { total, booked, completed, cancelled };
  }, [filteredSchedule]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Appointment schedule across all sites</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold text-foreground mt-1">{statCards.total}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Upcoming</p>
          <p className="text-lg font-semibold text-foreground mt-1">{statCards.booked}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-lg font-semibold text-foreground mt-1">{statCards.completed}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Cancelled / No-show</p>
          <p className="text-lg font-semibold text-foreground mt-1">{statCards.cancelled}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          >
            <option>All</option>
            <option>Booked</option>
            <option>CheckedIn</option>
            <option>Completed</option>
            <option>NoShow</option>
            <option>Cancelled</option>
          </select>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          >
            <option>All</option>
            {uniqueSites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
        </div>
        <div className="p-4 space-y-3">
          {filteredSchedule.map((row, index) => (
            <div key={index} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{row.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{row.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{row.site}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{row.status}</span>
              </div>
            </div>
          ))}
          {filteredSchedule.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No schedule rows found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
