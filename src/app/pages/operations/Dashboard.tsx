import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Users, Calendar, PhoneCall } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import {
  approveLeave,
  rejectLeave,
  searchLeaveRequests,
  searchOnCall,
  searchRosterAssignments,
  searchRosters,
  type LeaveRequestDto,
  type OnCallDto,
  type RosterAssignmentDto,
  type RosterDto,
} from "../../../api/operationsApi";

export default function OperationsDashboard() {
  const [rosters, setRosters] = useState<RosterDto[]>([]);
  const [assignments, setAssignments] = useState<RosterAssignmentDto[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestDto[]>([]);
  const [onCalls, setOnCalls] = useState<OnCallDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rosterList, assignmentList, leaveList, onCallList, users] = await Promise.all([
          searchRosters(),
          searchRosterAssignments().catch(() => [] as RosterAssignmentDto[]),
          searchLeaveRequests(),
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setRosters(rosterList);
        setAssignments(assignmentList);
        setLeaves(leaveList);
        setOnCalls(onCallList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) {
          setRosters([]);
          setAssignments([]);
          setLeaves([]);
          setOnCalls([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");
  const today = new Date().toISOString().slice(0, 10);
  const todayOnCalls = onCalls.filter((o) => o.date === today);
  const todayShifts = assignments
    .filter((a) => a.date === today && (a.role ?? "").toLowerCase() === "nurse")
    .map((a) => ({
      id: a.assignmentId,
      staff: userNames.get(a.userId) ?? `Nurse #${a.userId}`,
      role: "Nurse",
      shift: `Template #${a.shiftTemplateId}`,
      status: a.status,
    }));

  const refreshLeaves = async () => {
    const leaveList = await searchLeaveRequests();
    setLeaves(leaveList);
  };

  const weeklyNurseCoverage = (() => {
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const grouped = new Map<string, { scheduled: number; actual: number }>();
    for (const item of onCalls) {
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) continue;
      const day = dayOrder[(d.getDay() + 6) % 7];
      const current = grouped.get(day) ?? { scheduled: 0, actual: 0 };
      current.scheduled += 1;
      if (item.status.toLowerCase() !== "cancelled") current.actual += 1;
      grouped.set(day, current);
    }
    return dayOrder.slice(0, 5).map((day) => ({
      day,
      scheduled: grouped.get(day)?.scheduled ?? 0,
      actual: grouped.get(day)?.actual ?? 0,
    }));
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Nurse management and operational analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Nurses on Duty"
          value={todayShifts.length}
          icon={Users}
          color="bg-gradient-to-br from-[#6b9bd1]/20 to-[#5a8bc1]/10"
          subtitle="Currently active"
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves.length}
          icon={Calendar}
          color="bg-gradient-to-br from-[#f0b895]/20 to-[#d89768]/10"
          subtitle="Awaiting approval"
        />
        <StatCard
          title="On-Call Nurses"
          value={todayOnCalls.length}
          icon={PhoneCall}
          color="bg-gradient-to-br from-[#a68fcf]/20 to-[#9478bf]/10"
          subtitle="Emergency ready"
        />
      </div>

      <div className="mb-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Weekly Nurse Coverage</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyNurseCoverage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd8" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis tick={{ fontSize: 11, fill: "#736e68" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5dfd8",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="scheduled" fill="#6b9bd1" radius={[8, 8, 0, 0]} name="Scheduled" />
              <Bar dataKey="actual" fill="#95d4a8" radius={[8, 8, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
            <h3 className="text-sm font-medium text-foreground">Today's Nurse Roster</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{todayShifts.length} nurses on duty</p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {todayShifts.slice(0, 5).map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{shift.staff}</p>
                      <p className="text-xs text-muted-foreground">{shift.role} • {shift.shift}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#95d4a8]/30 text-xs font-medium text-foreground">
                    {shift.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
            <h3 className="text-sm font-medium text-foreground">Pending Leave Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Require your approval</p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div key={leave.leaveId} className="p-4 rounded-xl border-2 border-[#f0b895]/30 bg-[#f0b895]/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {userNames.get(leave.userId) ?? "Team Member"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{leave.leaveType}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#f0b895]/30 text-xs font-medium text-foreground">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {leave.startDate} to {leave.endDate}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await approveLeave(leave.leaveId);
                        await refreshLeaves();
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#95d4a8] text-white text-xs font-medium hover:shadow-md transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        await rejectLeave(leave.leaveId);
                        await refreshLeaves();
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
