import { Calendar, Clock } from "lucide-react";

const schedule = [
  { day: "Monday", site: "Apollo Clinic - Bangalore", time: "09:00 AM - 05:00 PM", patients: 12 },
  { day: "Tuesday", site: "Apollo Clinic - Bangalore", time: "09:00 AM - 05:00 PM", patients: 14 },
  { day: "Wednesday", site: "Apollo Clinic - Mumbai", time: "10:00 AM - 04:00 PM", patients: 10 },
  { day: "Thursday", site: "Apollo Clinic - Bangalore", time: "09:00 AM - 05:00 PM", patients: 13 },
  { day: "Friday", site: "Apollo Clinic - Bangalore", time: "09:00 AM - 03:00 PM", patients: 9 },
];

export default function ProviderSchedule() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly appointment schedule across all sites</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {schedule.map((day, index) => (
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
