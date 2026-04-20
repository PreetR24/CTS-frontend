import { Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { searchAppointments, type AppointmentDto } from "../../../api/appointmentsApi";
import { meApi } from "../../../api/authApi";
import { fetchSites } from "../../../api/masterdataApi";
import { fetchAvailabilityTemplates } from "../../../api/availabilityApi";

type ScheduleRow = {
  day: string;
  site: string;
  time: string;
  patients: number;
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ProviderSchedule() {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!me.providerId) return;

        const [sites, appointments] = await Promise.all([
          fetchSites({ page: 1, pageSize: 250 }),
          searchAppointments({ providerId: me.providerId }),
        ]);
        if (cancelled) return;

        const templateGroups = await Promise.all(
          sites.map(async (site) => ({
            siteId: site.siteId,
            siteName: site.name,
            templates: await fetchAvailabilityTemplates(me.providerId as number, site.siteId),
          }))
        );
        if (cancelled) return;

        const patientsByDay = new Map<number, number>();
        for (const apt of appointments as AppointmentDto[]) {
          const weekday = new Date(apt.slotDate).getDay();
          patientsByDay.set(weekday, (patientsByDay.get(weekday) ?? 0) + 1);
        }

        const rows: ScheduleRow[] = templateGroups.flatMap((group) =>
          group.templates.map((tpl) => ({
            day: DAY_LABELS[tpl.dayOfWeek] ?? `Day ${tpl.dayOfWeek}`,
            site: group.siteName,
            time: `${tpl.startTime} - ${tpl.endTime}`,
            patients: patientsByDay.get(tpl.dayOfWeek) ?? 0,
          }))
        );

        setSchedule(rows);
      } catch {
        if (!cancelled) setSchedule([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedSchedule = (() => {
    const dayIndex = new Map(DAY_LABELS.map((day, idx) => [day, idx]));
    return [...schedule].sort((a, b) => (dayIndex.get(a.day) ?? 99) - (dayIndex.get(b.day) ?? 99));
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly appointment schedule across all sites</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {orderedSchedule.map((day, index) => (
          <div key={index} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">{day.day}</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-[#7ba3c0]/10">
                <p className="text-xs text-muted-foreground mb-1">{day.site}</p>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-foreground">{day.time}</p>
                </div>
                <p className="text-xs font-medium text-primary">{day.patients} patients</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
