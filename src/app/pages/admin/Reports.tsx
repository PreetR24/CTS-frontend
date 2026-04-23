import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { exportReports, searchReports } from "../../../api/reportsApi";
import { isAxiosError } from "axios";

export default function AdminReports() {
  const [reportMetrics, setReportMetrics] = useState<Record<string, unknown>[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErrorMessage(null);
        const reports = await searchReports({ scope: "Operations" });
        if (cancelled) return;
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
      } catch (error) {
        const msg = isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message
          : undefined;
        setErrorMessage(msg ?? "Could not load report metrics.");
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

  const noShowData = reportMetrics.map((m, i) => ({
    month: String(m.month ?? `M${i + 1}`),
    rate: Number(m.noShowRate ?? 0),
  }));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Utilization, no-show rates, and performance metrics</p>
          {errorMessage && <p className="text-sm text-destructive mt-2">{errorMessage}</p>}
        </div>
        <button
          onClick={async () => {
            try {
              setErrorMessage(null);
              const blob = await exportReports({ scope: "Operations" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "report.csv";
              a.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              const msg = isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
              setErrorMessage(msg ?? "Could not export report.");
            }
          }}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
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
    </div>
  );
}
