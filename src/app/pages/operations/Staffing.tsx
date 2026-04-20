import { Users, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  searchOnCall,
  searchRosterAssignments,
  searchRosters,
  type OnCallDto,
  type RosterAssignmentDto,
  type RosterDto,
} from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type StaffMember = {
  id: number;
  name: string;
  role: string;
  shifts: number;
  hours: number;
  utilization: number;
  department: string;
};

export default function OperationsStaffing() {
  const [rosters, setRosters] = useState<RosterDto[]>([]);
  const [assignments, setAssignments] = useState<RosterAssignmentDto[]>([]);
  const [onCall, setOnCall] = useState<OnCallDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, a, o, users] = await Promise.all([
          searchRosters(),
          searchRosterAssignments(),
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setRosters(r);
        setAssignments(a);
        setOnCall(o);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) {
          setRosters([]);
          setAssignments([]);
          setOnCall([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const staffMembers: StaffMember[] = (() => {
    const shiftsByUser = new Map<number, number>();
    for (const item of assignments) {
      shiftsByUser.set(item.userId, (shiftsByUser.get(item.userId) ?? 0) + 1);
    }
    const onCallByUser = new Map<number, number>();
    for (const item of onCall) {
      onCallByUser.set(item.primaryUserId, (onCallByUser.get(item.primaryUserId) ?? 0) + 1);
    }
    return Array.from(shiftsByUser.entries()).map(([userId, shifts]) => {
      const onCallShifts = onCallByUser.get(userId) ?? 0;
      const totalShifts = shifts + onCallShifts;
      const hours = totalShifts * 8;
      const utilization = Math.min(100, Math.round((hours / 40) * 100));
      const role = assignments.find((a) => a.userId === userId)?.role ?? "Staff";
      return {
        id: userId,
        name: userNames.get(userId) ?? "Staff Member",
        role,
        shifts: totalShifts,
        hours,
        utilization,
        department: rosters[0]?.department ?? "General",
      };
    });
  })();

  const departmentCount = new Set(rosters.map((r) => r.department).filter(Boolean)).size || 1;

  const getUtilizationColor = (util: number) => {
    if (util >= 90) return "bg-[#95d4a8]";
    if (util >= 70) return "bg-[#f0b895]";
    return "bg-[#e8a0a0]";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Staffing Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Staff allocation and utilization metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/20">
          <p className="text-sm text-muted-foreground mb-1">Total Staff</p>
          <p className="text-3xl font-medium text-foreground">{staffMembers.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#75b488]/5 border border-[#95d4a8]/20">
          <p className="text-sm text-muted-foreground mb-1">Avg Utilization</p>
          <p className="text-3xl font-medium text-foreground">
            {staffMembers.length
              ? `${Math.round(staffMembers.reduce((sum, s) => sum + s.utilization, 0) / staffMembers.length)}%`
              : "0%"}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/20">
          <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
          <p className="text-3xl font-medium text-foreground">
            {staffMembers.reduce((sum, s) => sum + s.hours, 0)}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#a68fcf]/10 to-[#9478bf]/5 border border-[#a68fcf]/20">
          <p className="text-sm text-muted-foreground mb-1">Departments</p>
          <p className="text-3xl font-medium text-foreground">{departmentCount}</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Staff Members</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Utilization and performance metrics</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-all text-sm">
              <TrendingUp className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Staff Member</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Department</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Shifts This Week</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Hours</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-md bg-[#a68fcf]/20 text-xs font-medium text-foreground">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{member.department}</td>
                  <td className="py-4 px-4 text-sm text-foreground">{member.shifts} shifts</td>
                  <td className="py-4 px-4 text-sm text-foreground">{member.hours} hrs</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-[120px]">
                        <div 
                          className={`h-full ${getUtilizationColor(member.utilization)} transition-all`} 
                          style={{ width: `${member.utilization}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground min-w-[45px]">
                        {member.utilization}%
                      </span>
                    </div>
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
