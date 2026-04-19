import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar, Users, Filter } from "lucide-react";
import { fetchSites } from "../../../api/masterdataApi";
import { searchOnCall, type OnCallDto } from "../../../api/operationsApi";
import { fetchUsers } from "../../../api/usersApi";

export default function OperationsRoster() {
  const [showModal, setShowModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState("current");
  const [selectedSite, setSelectedSite] = useState("all");
  const [onCalls, setOnCalls] = useState<OnCallDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onCallList, users, siteList] = await Promise.all([
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (cancelled) return;
        setOnCalls(onCallList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setSites(siteList.map((s) => ({ id: s.siteId, name: s.name })));
      } catch {
        if (!cancelled) {
          setOnCalls([]);
          setSites([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shifts = useMemo(
    () =>
      onCalls
        .filter((o) => selectedSite === "all" || String(o.siteId) === selectedSite)
        .flatMap((o) => {
          const base = [
            {
              id: o.onCallId * 10 + 1,
              date: o.date,
              staff: userNames.get(o.primaryUserId) ?? `User #${o.primaryUserId}`,
              role: o.department ?? "OnCall",
              shift: `${o.startTime}-${o.endTime}`,
              siteId: o.siteId,
              status: o.status,
            },
          ];
          if (o.backupUserId) {
            base.push({
              id: o.onCallId * 10 + 2,
              date: o.date,
              staff: userNames.get(o.backupUserId) ?? `User #${o.backupUserId}`,
              role: `${o.department ?? "OnCall"} Backup`,
              shift: `${o.startTime}-${o.endTime}`,
              siteId: o.siteId,
              status: o.status,
            });
          }
          return base;
        }),
    [onCalls, selectedSite, userNames]
  );

  const getRosterByDay = (day: string) =>
    shifts.filter((s) => {
      const weekday = new Date(`${s.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
      return weekday === day;
    });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Roster Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan and manage staff schedules</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Shift Assignment
        </button>
        
        <select 
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="previous">Previous Week</option>
          <option value="current">Current Week</option>
          <option value="next">Next Week</option>
        </select>

        <select 
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Sites</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </div>

      {/* Weekly Roster Grid */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Weekly Schedule</h3>
              <p className="text-xs text-muted-foreground mt-0.5">March 30 - April 5, 2026</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-all text-sm">
              <Filter className="w-4 h-4" />
              Filter by Role
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground sticky left-0 bg-secondary/30">
                  Day
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Morning Shift<br/><span className="font-normal">(8AM - 4PM)</span>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Evening Shift<br/><span className="font-normal">(4PM - 12AM)</span>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Night Shift<br/><span className="font-normal">(12AM - 8AM)</span>
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                  Total Staff
                </th>
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((day, index) => {
                const dayShifts = getRosterByDay(day);
                const morningShifts = dayShifts.filter(s => s.shift.includes("Morning") || s.shift.includes("8AM"));
                const eveningShifts = dayShifts.filter(s => s.shift.includes("Evening") || s.shift.includes("4PM"));
                const nightShifts = dayShifts.filter(s => s.shift.includes("Night") || s.shift.includes("12AM"));

                return (
                  <tr key={day} className="border-b border-border hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sticky left-0 bg-card">
                      <div>
                        <p className="text-sm font-medium text-foreground">{day}</p>
                        <p className="text-xs text-muted-foreground">Mar {30 + index}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {morningShifts.length > 0 ? morningShifts.map(shift => (
                          <span key={shift.id} className="px-2 py-1 rounded-md bg-[#f0b895]/20 text-xs text-foreground">
                            {shift.staff.split(" ")[0]}
                          </span>
                        )) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {eveningShifts.length > 0 ? eveningShifts.map(shift => (
                          <span key={shift.id} className="px-2 py-1 rounded-md bg-[#a68fcf]/20 text-xs text-foreground">
                            {shift.staff.split(" ")[0]}
                          </span>
                        )) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {nightShifts.length > 0 ? nightShifts.map(shift => (
                          <span key={shift.id} className="px-2 py-1 rounded-md bg-[#6b9bd1]/20 text-xs text-foreground">
                            {shift.staff.split(" ")[0]}
                          </span>
                        )) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-lg font-medium text-foreground">{dayShifts.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Add Shift Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Staff Member</label>
                <select className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Sneha Reddy - Nurse</option>
                  <option>Deepa Iyer - Tech</option>
                  <option>Rahul Verma - Nurse</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                  <input 
                    type="date" 
                    defaultValue="2026-03-31"
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Shift</label>
                  <select className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Morning (8AM-4PM)</option>
                    <option>Evening (4PM-12AM)</option>
                    <option>Night (12AM-8AM)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Site</label>
                <select className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {sites.map(site => (
                    <option key={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
              >
                Assign Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
