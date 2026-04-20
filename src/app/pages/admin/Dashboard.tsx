import { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Building2, Users, Activity, Calendar } from "lucide-react";
import { fetchRooms, fetchServices, fetchSites } from "../../../api/masterdataApi";
import { mapSiteRows } from "../../../api/adminViewMappers";
import { fetchUsers } from "../../../api/usersApi";
import {
  cancelBlackout,
  createAuditLog,
  createBlackout,
  createCapacityRule,
  createSla,
  searchAuditLogs,
  searchBlackouts,
  searchCapacityRules,
  searchSlas,
} from "../../../api/adminGovernanceApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const [siteRows, setSiteRows] = useState<{ id: number; name: string; location: string; rooms: number; status: string }[]>(
    []
  );
  const [userList, setUserList] = useState<{ role: string }[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [blackoutCount, setBlackoutCount] = useState(0);
  const [blackouts, setBlackouts] = useState<Array<{ blackoutId: number; siteId: number; startDate: string; endDate: string }>>([]);
  const [capacityRuleCount, setCapacityRuleCount] = useState(0);
  const [slaCount, setSlaCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [sites, rooms, users, services] = await Promise.all([
          fetchSites({ page: 1, pageSize: 250 }),
          fetchRooms({ page: 1, pageSize: 500 }),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchServices(),
        ]);
        if (!cancelled) {
          setSiteRows(mapSiteRows(sites, rooms));
          setUserList(users.map((u) => ({ role: u.role })));
          setServiceCount(services.length);
        }
        const firstSiteId = sites[0]?.siteId;
        if (firstSiteId) {
          const [blackouts, rules, slas, audits] = await Promise.all([
            searchBlackouts(firstSiteId),
            searchCapacityRules(),
            searchSlas(),
            searchAuditLogs({ page: 1, pageSize: 200 }),
          ]);
          if (!cancelled) {
            setBlackoutCount(blackouts.length);
            setBlackouts(
              blackouts.map((b) => ({
                blackoutId: b.blackoutId,
                siteId: b.siteId,
                startDate: b.startDate,
                endDate: b.endDate,
              }))
            );
            setCapacityRuleCount(rules.length);
            setSlaCount(slas.length);
            setAuditCount(audits.length);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const siteData = siteRows.map((site) => ({
    name: site.name.includes(" - ") ? site.name.split(" - ").slice(1).join(" - ") || site.name : site.name,
    rooms: site.rooms,
  }));

  const roleData = [
    { name: "Providers", value: userList.filter((u) => u.role === "Provider").length, color: "#7ba3c0" },
    { name: "Nurses", value: userList.filter((u) => u.role === "Nurse").length, color: "#a9d4b8" },
    { name: "Front Desk", value: userList.filter((u) => u.role === "FrontDesk").length, color: "#e8c9a9" },
    { name: "Admin", value: userList.filter((u) => u.role === "Admin").length, color: "#c4b5e8" },
  ];

  const totalRooms = siteRows.reduce((sum, site) => sum + site.rooms, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">System-wide statistics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Sites"
          value={loading ? "—" : siteRows.length}
          icon={Building2}
          color="bg-[#c4b5e8]/20"
          subtitle="Across India"
        />
        <StatCard
          title="Active Users"
          value={loading ? "—" : userList.length}
          icon={Users}
          color="bg-[#7ba3c0]/20"
          subtitle="All roles"
        />
        <StatCard
          title="Services Offered"
          value={loading ? "—" : serviceCount}
          icon={Activity}
          color="bg-[#a9d4b8]/20"
          subtitle="Active services"
        />
        <StatCard
          title="Total Rooms / Blackouts"
          value={loading ? "—" : `${totalRooms} / ${blackoutCount}`}
          icon={Calendar}
          color="bg-[#e8c9a9]/20"
          subtitle="Capacity + blackout windows"
        />
      </div>
      <div className="mb-6 p-4 rounded-xl border border-border bg-card">
        <p className="text-sm font-medium text-foreground mb-3">Governance Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">Capacity Rules: {capacityRuleCount}</span>
          <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">SLA Rules: {slaCount}</span>
          <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">Audit Logs: {auditCount}</span>
          <button
            onClick={async () => {
              const site = siteRows[0];
              if (!site) return;
              await createBlackout({
                siteId: site.id,
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
                reason: "Manual blackout",
              });
            }}
            className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary"
          >
            Add Blackout
          </button>
          <button
            onClick={async () =>
              createCapacityRule({
                scope: "Site",
                scopeId: siteRows[0]?.id,
                bufferMin: 10,
                effectiveFrom: new Date().toISOString().slice(0, 10),
              })
            }
            className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary"
          >
            Add Capacity Rule
          </button>
          <button
            onClick={async () =>
              createSla({
                scope: "Appointment",
                metric: "WaitTime",
                targetValue: 15,
                unit: "Minutes",
              })
            }
            className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary"
          >
            Add SLA
          </button>
          <button
            onClick={async () =>
              createAuditLog({
                action: "AdminDashboardAction",
                resource: "Governance",
                metadata: "Quick action invoked",
              })
            }
            className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary"
          >
            Write Audit Log
          </button>
          {blackouts.slice(0, 3).map((b) => (
            <button
              key={b.blackoutId}
              onClick={async () => {
                await cancelBlackout(b.blackoutId);
                setBlackouts((prev) => prev.filter((x) => x.blackoutId !== b.blackoutId));
                setBlackoutCount((c) => Math.max(0, c - 1));
              }}
              className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary"
            >
              Cancel Blackout #{b.blackoutId}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Rooms by Site</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={siteData}>
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
              <Bar dataKey="rooms" fill="#7ba3c0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Staff Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
