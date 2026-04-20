import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
  searchLeaveRequests,
  searchOnCall,
  searchRosterAssignments,
  type LeaveRequestDto,
  type OnCallDto,
  type RosterAssignmentDto,
} from "../../../api/operationsApi";
import { searchReports, type OpsReportDto } from "../../../api/reportsApi";

export default function OperationsAnalytics() {
  const [leaveDataRaw, setLeaveDataRaw] = useState<LeaveRequestDto[]>([]);
  const [assignments, setAssignments] = useState<RosterAssignmentDto[]>([]);
  const [onCall, setOnCall] = useState<OnCallDto[]>([]);
  const [reports, setReports] = useState<OpsReportDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leave, rosterAssignments, onCallList, reportList] = await Promise.all([
          searchLeaveRequests(),
          searchRosterAssignments(),
          searchOnCall(),
          searchReports({ scope: "Operations" }),
        ]);
        if (cancelled) return;
        setLeaveDataRaw(leave);
        setAssignments(rosterAssignments);
        setOnCall(onCallList);
        setReports(reportList);
      } catch {
        if (!cancelled) {
          setLeaveDataRaw([]);
          setAssignments([]);
          setOnCall([]);
          setReports([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const utilizationTrend = (() => {
    const byMonth = new Map<string, number>();
    for (const a of assignments) {
      const month = (a.date ?? "").slice(0, 7);
      if (!month) continue;
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-6)
      .map(([month, shifts]) => ({
        month: month.slice(5),
        utilization: Math.min(100, Math.round((shifts * 8 * 100) / 160)),
      }));
  })();

  const departmentData = (() => {
    const map = new Map<string, number>();
    for (const item of onCall) {
      const key = item.department || "General";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const colors = ["#6b9bd1", "#95d4a8", "#f0b895", "#a68fcf", "#f5a8c8"];
    return Array.from(map.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  })();

  const leaveData = (() => {
    const map = new Map<string, { approved: number; rejected: number }>();
    for (const leave of leaveDataRaw) {
      const month = (leave.startDate ?? "").slice(0, 7);
      if (!month) continue;
      const current = map.get(month) ?? { approved: 0, rejected: 0 };
      if ((leave.status ?? "").toLowerCase() === "approved") current.approved += 1;
      if ((leave.status ?? "").toLowerCase() === "rejected") current.rejected += 1;
      map.set(month, current);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-6)
      .map(([month, stats]) => ({ month: month.slice(5), ...stats }));
  })();

  const utilizationKpi =
    utilizationTrend.length > 0
      ? utilizationTrend[utilizationTrend.length - 1].utilization
      : 0;
  const totalLeave = leaveData.reduce((sum, m) => sum + m.approved + m.rejected, 0);
  const approvedLeave = leaveData.reduce((sum, m) => sum + m.approved, 0);
  const approvalRate = totalLeave > 0 ? Math.round((approvedLeave / totalLeave) * 100) : 0;
  const coverageRate = assignments.length > 0 ? Math.min(100, Math.round((onCall.length * 100) / assignments.length)) : 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Operational performance and trends</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-all text-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#75b488]/5 border border-[#95d4a8]/30">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">Staff Utilization</p>
            <TrendingUp className="w-5 h-5 text-[#95d4a8]" />
          </div>
          <p className="text-3xl font-medium text-foreground mb-1">{utilizationKpi}%</p>
          <p className="text-xs text-[#95d4a8]">Live from roster assignments</p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/30">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">Leave Approval Rate</p>
            <TrendingUp className="w-5 h-5 text-[#f0b895]" />
          </div>
          <p className="text-3xl font-medium text-foreground mb-1">{approvalRate}%</p>
          <p className="text-xs text-[#f0b895]">Calculated from leave requests</p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/30">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">Coverage Rate</p>
            {coverageRate >= 90 ? (
              <TrendingUp className="w-5 h-5 text-[#6b9bd1]" />
            ) : (
              <TrendingDown className="w-5 h-5 text-[#6b9bd1]" />
            )}
          </div>
          <p className="text-3xl font-medium text-foreground mb-1">{coverageRate}%</p>
          <p className="text-xs text-[#6b9bd1]">On-call coverage vs assignments</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Staff Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={utilizationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis tick={{ fontSize: 11, fill: "#736e68" }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5dfd8",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line 
                type="monotone" 
                dataKey="utilization" 
                stroke="#6b9bd1" 
                strokeWidth={3}
                dot={{ fill: "#6b9bd1", r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Staff Distribution by Department</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}%`}
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Leave Request Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={leaveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd8" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#736e68" }} />
            <YAxis tick={{ fontSize: 11, fill: "#736e68" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5dfd8",
                borderRadius: "12px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="approved" fill="#95d4a8" radius={[8, 8, 0, 0]} name="Approved" />
            <Bar dataKey="rejected" fill="#e8a0a0" radius={[8, 8, 0, 0]} name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-6">
        <h3 className="text-sm font-medium text-foreground mb-2">Generated Reports</h3>
        <p className="text-xs text-muted-foreground">
          {reports.length} operations reports available from backend
        </p>
      </div>
    </div>
  );
}
