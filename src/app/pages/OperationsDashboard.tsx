import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Users, Calendar, ClipboardList, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { searchLeaveRequests, searchOnCall, searchRosters } from "../../api/operationsApi";
import { fetchUsers } from "../../api/usersApi";

export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<"roster" | "leave">("roster");
  const [mockShifts, setShifts] = useState<Array<{ id: number; staff: string; role: string; date: string; shift: string; site: string; status: string }>>([]);
  const [mockLeaveRequests, setLeaves] = useState<Array<{ id: number; staff: string; type: string; startDate: string; endDate: string; status: string; impactedAppts: number }>>([]);
  const [utilizationData, setUtilizationData] = useState<Array<{ name: string; appointments: number; capacity: number }>>([]);
  const [providerUtilization, setProviderUtilization] = useState<Array<{ name: string; utilization: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leaves, onCalls, rosters, users] = await Promise.all([
          searchLeaveRequests(),
          searchOnCall(),
          searchRosters(),
          fetchUsers({ page: 1, pageSize: 500 }),
        ]);
        if (cancelled) return;
        const names = new Map(users.map((u) => [u.userId, u.name]));
        setShifts(
          onCalls.map((o, i) => ({
            id: i + 1,
            staff: names.get(o.primaryUserId) ?? `User #${o.primaryUserId}`,
            role: o.department ?? "OnCall",
            date: o.date,
            shift: `${o.startTime}-${o.endTime}`,
            site: `Site #${o.siteId}`,
            status: o.status,
          }))
        );
        setLeaves(
          leaves.map((l) => ({
            id: l.leaveId,
            staff: names.get(l.userId) ?? `User #${l.userId}`,
            type: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            status: l.status,
            impactedAppts: 0,
          }))
        );
        setUtilizationData(
          rosters.slice(0, 6).map((r, i) => ({
            name: `W${i + 1}`,
            appointments: 20 + i * 2,
            capacity: 30,
          }))
        );
        setProviderUtilization(
          users
            .filter((u) => u.role === "Provider")
            .slice(0, 6)
            .map((u, i) => ({ name: u.name, utilization: 70 + i * 4 }))
        );
      } catch {
        if (!cancelled) {
          setShifts([]);
          setLeaves([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingLeaves = mockLeaveRequests.filter(req => req.status === "Pending").length;
  const today = new Date().toISOString().slice(0, 10);
  const totalStaffScheduled = useMemo(() => mockShifts.filter(s => s.date === today).length, [mockShifts, today]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Operations Dashboard" userName="Ravi Krishnan" userRole="Operations Manager" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Staff Scheduled Today"
            value={totalStaffScheduled}
            icon={Users}
            color="bg-[#f5d4c4]/30"
            subtitle="Active shifts"
          />
          <StatCard
            title="Pending Leave Requests"
            value={pendingLeaves}
            icon={ClipboardList}
            color="bg-[#f4a6a6]/20"
            subtitle="Awaiting approval"
          />
          <StatCard
            title="Weekly Utilization"
            value="82%"
            icon={TrendingUp}
            color="bg-[#c4f0d4]/30"
            subtitle="Capacity used"
          />
          <StatCard
            title="Staffing Alerts"
            value="3"
            icon={AlertCircle}
            color="bg-[#d4c4f0]/20"
            subtitle="Require attention"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Weekly Capacity Utilization</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d5c7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b7e74" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8b7e74" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0d5c7",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="appointments" stroke="#a8c4d4" strokeWidth={2} dot={{ fill: "#a8c4d4", r: 4 }} />
                <Line type="monotone" dataKey="capacity" stroke="#f5d4c4" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#f5d4c4", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Provider Utilization Rate</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={providerUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d5c7" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8b7e74" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#8b7e74" }} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0d5c7",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="utilization" fill="#d4c4f0" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("roster")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "roster"
                    ? "bg-primary/20 text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                Staff Roster
              </button>
              <button
                onClick={() => setActiveTab("leave")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "leave"
                    ? "bg-primary/20 text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                Leave Management
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === "roster" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Staff Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Shift</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockShifts.map((shift) => (
                      <tr key={shift.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{shift.staff}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-md bg-primary/20 text-xs text-foreground">
                            {shift.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{shift.date}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{shift.shift}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{shift.site}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-md bg-[#c4f0d4]/30 text-xs text-foreground">
                            {shift.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "leave" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Staff Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Leave Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Start Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">End Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Impact</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeaveRequests.map((leave) => (
                      <tr key={leave.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{leave.staff}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{leave.type}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{leave.startDate}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{leave.endDate}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {leave.impactedAppts} appointments
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-md text-xs ${
                              leave.status === "Pending"
                                ? "bg-[#f5d4c4]/30 text-foreground"
                                : leave.status === "Approved"
                                ? "bg-[#c4f0d4]/30 text-foreground"
                                : "bg-[#f4a6a6]/30 text-foreground"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {leave.status === "Pending" && (
                            <div className="flex gap-2">
                              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                                Approve
                              </button>
                              <button className="px-3 py-1 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-xs">
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
