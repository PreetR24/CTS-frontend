import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { createReport, exportReports, getReportById, searchReports } from "../../../api/reportsApi";

export default function AdminReports() {
  const [reportMetrics, setReportMetrics] = useState<Record<string, unknown>[]>([]);
  const [reportIds, setReportIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reports = await searchReports({ scope: "Operations" });
        if (cancelled) return;
        setReportIds(reports.map((r) => r.reportId));
        const metrics: Record<string, unknown>[] = [];
        for (const r of reports) {
          if (!r.metricsJson) continue;
          try {
            metrics.push(JSON.parse(r.metricsJson) as Record<string, unknown>);
          } catch {
            // ignore malformed metrics
          }
        }
        setReportMetrics(metrics);
      } catch {
        if (!cancelled) setReportMetrics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const utilizationData = reportMetrics.map((m, i) => ({
    name: String(m.day ?? m.name ?? `D${i + 1}`),
    appointments: Number(m.appointments ?? 0),
    capacity: Number(m.capacity ?? 0),
  }));

  const appointmentStatusData = (() => {
    const completed = reportMetrics.reduce((a, m) => a + Number(m.completed ?? 0), 0);
    const booked = reportMetrics.reduce((a, m) => a + Number(m.booked ?? 0), 0);
    const cancelled = reportMetrics.reduce((a, m) => a + Number(m.cancelled ?? 0), 0);
    const noShow = reportMetrics.reduce((a, m) => a + Number(m.noShow ?? 0), 0);
    return [
      { name: "Completed", value: completed, color: "#c4f0d4" },
      { name: "Booked", value: booked, color: "#a8c4d4" },
      { name: "Cancelled", value: cancelled, color: "#f4a6a6" },
      { name: "No Show", value: noShow, color: "#f5d4c4" },
    ];
  })();

  const providerUtilization = reportMetrics
    .filter((m) => typeof m.providerName === "string")
    .map((m) => ({
      name: String(m.providerName),
      utilization: Number(m.utilization ?? 0),
    }));

  const avgUtilization = (() => {
    const rows = providerUtilization.map((p) => p.utilization).filter((x) => Number.isFinite(x));
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((a, b) => a + b, 0) / rows.length);
  })();

  const avgWait = (() => {
    const waits = reportMetrics.map((m) => Number(m.waitMinutes ?? 0)).filter((x) => x > 0);
    if (waits.length === 0) return 0;
    return Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
  })();

  const noShowData = reportMetrics.map((m, i) => ({
    month: String(m.month ?? `M${i + 1}`),
    rate: Number(m.noShowRate ?? 0),
  }));

  const avgNoShow = (() => {
    if (noShowData.length === 0) return 0;
    return Math.round(noShowData.reduce((a, b) => a + b.rate, 0) / noShowData.length);
  })();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Utilization, no-show rates, and performance metrics</p>
        </div>
        <button
          onClick={async () => {
            const blob = await exportReports({ scope: "Operations" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "report.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-muted-foreground">Avg Utilization Rate</p>
            <TrendingUp className="w-4 h-4 text-[#a9d4b8]" />
          </div>
          <p className="text-2xl font-medium text-foreground">{avgUtilization}%</p>
          <p className="text-xs text-[#a9d4b8] mt-1">+5.2% from last month</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-muted-foreground">No-Show Rate</p>
            <TrendingDown className="w-4 h-4 text-[#eb9d9d]" />
          </div>
          <p className="text-2xl font-medium text-foreground">{avgNoShow}%</p>
          <p className="text-xs text-[#eb9d9d] mt-1">-1.2% from last month</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-muted-foreground">Avg Wait Time</p>
            <TrendingDown className="w-4 h-4 text-[#a9d4b8]" />
          </div>
          <p className="text-2xl font-medium text-foreground">{avgWait} min</p>
          <p className="text-xs text-[#a9d4b8] mt-1">-3 min from last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Weekly Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis tick={{ fontSize: 11, fill: "#736e68" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ebe6df",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="appointments" fill="#7ba3c0" radius={[8, 8, 0, 0]} />
              <Bar dataKey="capacity" fill="#e8c9a9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Appointment Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={appointmentStatusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {appointmentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">No-Show Rate Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={noShowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis tick={{ fontSize: 11, fill: "#736e68" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ebe6df",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="rate" stroke="#eb9d9d" strokeWidth={2} dot={{ fill: "#eb9d9d", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Provider Utilization</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={providerUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#736e68" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#736e68" }} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ebe6df",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="utilization" fill="#c4b5e8" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={async () => {
            await createReport({
              scope: "Operations",
              metricsJson: JSON.stringify({ generatedAt: new Date().toISOString(), source: "frontend-admin" }),
            });
          }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
        >
          Generate Report
        </button>
        <button
          onClick={async () => {
            if (reportIds.length > 0) {
              await getReportById(reportIds[0]);
            }
          }}
          className="px-4 py-2 rounded-lg border border-border text-sm"
        >
          Fetch First Report
        </button>
      </div>
    </div>
  );
}
