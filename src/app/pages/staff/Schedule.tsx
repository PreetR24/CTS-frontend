import { useEffect, useState } from "react";
import { meApi } from "../../../api/authApi";
import { fetchSites } from "../../../api/masterdataApi";
import { searchOnCall, searchRosterAssignments, type OnCallDto, type RosterAssignmentDto } from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type ShiftRow = {
  id: number;
  date: string;
  shift: string;
  site: string;
  status: string;
};

export default function StaffSchedule() {
  const [rows, setRows] = useState<ShiftRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, users, sites, assignments, onCalls] = await Promise.all([
          meApi(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchSites({ page: 1, pageSize: 250 }),
          searchRosterAssignments(),
          searchOnCall(),
        ]);
        if (cancelled) return;

        const meUser = users.find((u) => u.email.toLowerCase() === me.email.toLowerCase());
        const uid = meUser?.userId ?? me.userId;
        const siteNames = new Map(sites.map((s) => [s.siteId, s.name]));

        const assignmentRows: ShiftRow[] = assignments
          .filter((a) => a.userId === uid)
          .map((a) => ({
            id: a.assignmentId,
            date: a.date,
            shift: "Assigned Shift",
            site: "Assigned Site",
            status: a.status,
          }));

        const onCallRows: ShiftRow[] = onCalls
          .filter((o) => o.primaryUserId === uid || o.backupUserId === uid)
          .map((o) => ({
            id: 100000 + o.onCallId,
            date: o.date,
            shift: `${o.startTime}-${o.endTime}`,
            site: siteNames.get(o.siteId) ?? "Unknown Site",
            status: o.status,
          }));

        setRows([...assignmentRows, ...onCallRows]);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">View your upcoming shifts</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Shift</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((shift) => (
                <tr key={shift.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{shift.date}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{shift.shift}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{shift.site}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#a9d4b8]/30 text-xs font-medium text-foreground">{shift.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
