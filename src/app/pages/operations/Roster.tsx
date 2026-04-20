import { useEffect, useState } from "react";
import { Plus, Calendar, Users, Filter } from "lucide-react";
import { fetchSites } from "../../../api/masterdataApi";
import {
  createOnCall,
  createRoster,
  createRosterAssignment,
  deleteRoster,
  getRosterById,
  markRosterAssignmentAbsent,
  publishRoster,
  searchOnCall,
  searchRosterAssignments,
  searchRosters,
  swapRosterAssignment,
  updateRoster,
  type OnCallDto,
} from "../../../api/operationsApi";
import {
  createShiftTemplate,
  deleteShiftTemplate,
  getShiftTemplateById,
  searchShiftTemplates,
  updateShiftTemplate,
  type ShiftTemplateDto,
} from "../../../api/operationsPlanningApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import { meApi } from "../../../api/authApi";

export default function OperationsRoster() {
  const [showModal, setShowModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState("current");
  const [selectedSite, setSelectedSite] = useState("all");
  const [onCalls, setOnCalls] = useState<OnCallDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ userId: number; name: string; role: string }>>([]);
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [formBackupUserId, setFormBackupUserId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSiteId, setFormSiteId] = useState<number | null>(null);
  const [formShift, setFormShift] = useState("Morning (8AM-4PM)");
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplateDto[]>([]);
  const [rosterIds, setRosterIds] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onCallList, users, siteList, templates] = await Promise.all([
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchSites({ page: 1, pageSize: 250 }),
          searchShiftTemplates(),
        ]);
        if (cancelled) return;
        setOnCalls(onCallList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setUsers(users.map((u) => ({ userId: u.userId, name: u.name, role: u.role })));
        setSites(siteList.map((s) => ({ id: s.siteId, name: s.name })));
        setShiftTemplates(templates);
        const rosterList = await searchRosters().catch(() => []);
        setRosterIds(rosterList.map((r) => r.rosterId));
        setFormSiteId(siteList[0]?.siteId ?? null);
        setFormUserId(users[0]?.userId ?? null);
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

  const shifts = onCalls
    .filter((o) => selectedSite === "all" || String(o.siteId) === selectedSite)
    .flatMap((o) => {
      const base = [
        {
          id: o.onCallId * 10 + 1,
          date: o.date,
          staff: userNames.get(o.primaryUserId) ?? "Team Member",
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
          staff: userNames.get(o.backupUserId) ?? "Team Member",
          role: `${o.department ?? "OnCall"} Backup`,
          shift: `${o.startTime}-${o.endTime}`,
          siteId: o.siteId,
          status: o.status,
        });
      }
      return base;
    });

  const getRosterByDay = (day: string) =>
    shifts.filter((s) => {
      const weekday = new Date(`${s.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
      return weekday === day;
    });

  const refreshOnCalls = async () => {
    const onCallList = await searchOnCall(selectedSite === "all" ? undefined : { siteId: Number(selectedSite) });
    setOnCalls(onCallList);
  };

  const parseShift = (shift: string): { start: string; end: string } => {
    if (shift.startsWith("Morning")) return { start: "08:00", end: "16:00" };
    if (shift.startsWith("Evening")) return { start: "16:00", end: "23:59" };
    return { start: "00:00", end: "08:00" };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Roster Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan and manage staff schedules</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
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
        <button
          onClick={async () => {
            if (!formSiteId) return;
            const t = await createShiftTemplate({
              name: "General Morning",
              startTime: "08:00",
              endTime: "16:00",
              breakMinutes: 30,
              role: "General",
              siteId: formSiteId,
            });
            setShiftTemplates((prev) => [t, ...prev]);
          }}
          className="px-4 py-2.5 rounded-lg border border-border text-sm"
        >
          Add Shift Template
        </button>
      </div>
      <div className="mb-6 p-4 border border-border rounded-xl bg-card">
        <p className="text-sm font-medium text-foreground mb-2">Shift Templates</p>
        <div className="space-y-2">
          {shiftTemplates.slice(0, 5).map((t) => (
            <div key={t.shiftTemplateId} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>#{t.shiftTemplateId}</span>
              <span>{t.name}</span>
              <span>{t.startTime}-{t.endTime}</span>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  const detail = await getShiftTemplateById(t.shiftTemplateId);
                  setNotice(
                    `Template ${detail.name} ${detail.startTime}-${detail.endTime} (${detail.role})`
                  );
                }}
              >
                Detail
              </button>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  await updateShiftTemplate(t.shiftTemplateId, { breakMinutes: t.breakMinutes + 5 });
                  setShiftTemplates(await searchShiftTemplates());
                }}
              >
                +5m break
              </button>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  await deleteShiftTemplate(t.shiftTemplateId);
                  setShiftTemplates((prev) => prev.filter((x) => x.shiftTemplateId !== t.shiftTemplateId));
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6 p-4 border border-border rounded-xl bg-card">
        <p className="text-sm font-medium text-foreground mb-2">Rosters</p>
        <div className="space-y-2">
          {rosterIds.slice(0, 10).map((id) => (
            <div key={id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>#{id}</span>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  const detail = await getRosterById(id);
                  setNotice(
                    `Roster ${detail.rosterId}: ${detail.periodStart} to ${detail.periodEnd} (${detail.status})`
                  );
                }}
              >
                Detail
              </button>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  await updateRoster(id, { status: "Draft" });
                  const list = await searchRosters();
                  setRosterIds(list.map((r) => r.rosterId));
                }}
              >
                Set Draft
              </button>
              <button
                className="px-2 py-1 border border-border rounded"
                onClick={async () => {
                  await deleteRoster(id);
                  setRosterIds((prev) => prev.filter((x) => x !== id));
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
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
                <select
                  value={formUserId ?? ""}
                  onChange={(e) => setFormUserId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.name} - {u.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Backup Staff</label>
                <select
                  value={formBackupUserId ?? ""}
                  onChange={(e) => setFormBackupUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.name} - {u.role}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Shift</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option>Morning (8AM-4PM)</option>
                    <option>Evening (4PM-12AM)</option>
                    <option>Night (12AM-8AM)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Site</label>
                <select
                  value={formSiteId ?? ""}
                  onChange={(e) => setFormSiteId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
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
                onClick={async () => {
                  if (!formSiteId || !formUserId) return;
                  const shift = parseShift(formShift);
                  const me = await meApi();
                  const roster = await createRoster({
                    siteId: formSiteId,
                    department: "General",
                    periodStart: formDate,
                    periodEnd: formDate,
                  });
                  await publishRoster(roster.rosterId, me.userId);
                  const templates = await searchShiftTemplates({ siteId: formSiteId });
                  const templateId = templates[0]?.shiftTemplateId;
                  if (templateId) {
                    const assignment = await createRosterAssignment({
                      rosterId: roster.rosterId,
                      userId: formUserId,
                      shiftTemplateId: templateId,
                      date: formDate,
                      role: "General",
                    });
                    if (formBackupUserId) {
                      await swapRosterAssignment(assignment.assignmentId, { withUserId: formBackupUserId });
                    }
                    if (formShift.startsWith("Night")) {
                      await markRosterAssignmentAbsent(assignment.assignmentId, { reason: "Night shift placeholder" });
                    }
                  }
                  await createOnCall({
                    siteId: formSiteId,
                    department: "General",
                    date: formDate,
                    startTime: shift.start,
                    endTime: shift.end,
                    primaryUserId: formUserId,
                    backupUserId: formBackupUserId ?? undefined,
                  });
                  await refreshOnCalls();
                  await searchRosters();
                  await searchRosterAssignments();
                  setShowModal(false);
                }}
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
