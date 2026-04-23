import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  searchOnCall,
  searchRosterAssignments,
  type OnCallDto,
  type RosterAssignmentDto,
} from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type NurseMember = {
  id: number;
  name: string;
  shifts: number;
  onCallShifts: number;
};

export default function OperationsStaffing() {
  const [assignments, setAssignments] = useState<RosterAssignmentDto[]>([]);
  const [onCall, setOnCall] = useState<OnCallDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, o, users] = await Promise.all([
          searchRosterAssignments(),
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setAssignments(a);
        setOnCall(o);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) {
          setAssignments([]);
          setOnCall([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nurseMembers: NurseMember[] = (() => {
    const shiftsByUser = new Map<number, number>();
    for (const item of assignments) {
      shiftsByUser.set(item.userId, (shiftsByUser.get(item.userId) ?? 0) + 1);
    }
    const onCallByUser = new Map<number, number>();
    for (const item of onCall) {
      onCallByUser.set(item.primaryUserId, (onCallByUser.get(item.primaryUserId) ?? 0) + 1);
    }
    const allIds = new Set<number>([
      ...Array.from(shiftsByUser.keys()),
      ...Array.from(onCallByUser.keys()),
    ]);
    return Array.from(allIds).map((userId) => ({
      id: userId,
      name: userNames.get(userId) ?? `Nurse #${userId}`,
      shifts: shiftsByUser.get(userId) ?? 0,
      onCallShifts: onCallByUser.get(userId) ?? 0,
    }));
  })();
  const filteredNurseMembers = useMemo(
    () => nurseMembers.filter((n) => !nameFilter || n.name.toLowerCase().includes(nameFilter.toLowerCase())),
    [nurseMembers, nameFilter]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Nurse Workload</h1>
        <p className="text-sm text-muted-foreground mt-1">Roster and on-call distribution by nurse</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 mb-6 max-w-md">
        <label className="block text-xs text-muted-foreground mb-1">Nurse Name</label>
        <input
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Filter nurse"
          className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/20">
          <p className="text-sm text-muted-foreground mb-1">Total Nurses</p>
          <p className="text-3xl font-medium text-foreground">{filteredNurseMembers.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/20">
          <p className="text-sm text-muted-foreground mb-1">Total Nurse Shifts</p>
          <p className="text-3xl font-medium text-foreground">
            {filteredNurseMembers.reduce((sum, n) => sum + n.shifts, 0)}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <h3 className="text-sm font-medium text-foreground">Nurse Assignment Summary</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Roster and on-call counts for nurses</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Nurse</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Roster Shifts</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">On-Call Shifts</th>
              </tr>
            </thead>
            <tbody>
              {filteredNurseMembers.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-foreground">{member.shifts}</td>
                  <td className="py-4 px-4 text-sm text-foreground">{member.onCallShifts}</td>
                </tr>
              ))}
              {filteredNurseMembers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-sm text-muted-foreground">
                    No nurse assignment data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
