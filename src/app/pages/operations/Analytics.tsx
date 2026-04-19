import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";

export default function OperationsAnalytics() {
  const utilizationTrend = [
    { month: "Jan", utilization: 88 },
    { month: "Feb", utilization: 92 },
    { month: "Mar", utilization: 89 },
    { month: "Apr", utilization: 94 },
  ];

  const departmentData = [
    { name: "Emergency", value: 28, color: "#6b9bd1" },
    { name: "ICU", value: 24, color: "#95d4a8" },
    { name: "Surgery", value: 20, color: "#f0b895" },
    { name: "Pediatrics", value: 16, color: "#a68fcf" },
    { name: "Others", value: 12, color: "#f5a8c8" },
  ];

  const leaveData = [
    { month: "Jan", approved: 12, rejected: 2 },
    { month: "Feb", approved: 15, rejected: 3 },
    { month: "Mar", approved: 10, rejected: 1 },
    { month: "Apr", approved: 14, rejected: 2 },
  ];

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
          <p className="text-3xl font-medium text-foreground mb-1">94%</p>
          <p className="text-xs text-[#95d4a8]">+3% from last month</p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/30">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">Leave Approval Rate</p>
            <TrendingUp className="w-5 h-5 text-[#f0b895]" />
          </div>
          <p className="text-3xl font-medium text-foreground mb-1">85%</p>
          <p className="text-xs text-[#f0b895]">+2% from last month</p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border border-[#6b9bd1]/30">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">Coverage Rate</p>
            <TrendingUp className="w-5 h-5 text-[#6b9bd1]" />
          </div>
          <p className="text-3xl font-medium text-foreground mb-1">98%</p>
          <p className="text-xs text-[#6b9bd1]">Excellent performance</p>
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
    </div>
  );
}
