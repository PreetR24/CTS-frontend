import { useEffect, useMemo, useState } from "react";
import { StatCard } from "../../components/StatCard";
import { Building2, Users, Activity, Calendar } from "lucide-react";
import { fetchRooms, fetchServices, fetchSites } from "../../../api/masterdataApi";
import { mapSiteRows } from "../../../api/adminViewMappers";
import { fetchUsers } from "../../../api/usersApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const [siteRows, setSiteRows] = useState<{ id: number; name: string; location: string; rooms: number; status: string }[]>(
    []
  );
  const [userList, setUserList] = useState<{ role: string }[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const siteData = useMemo(
    () =>
      siteRows.map((site) => ({
        name: site.name.includes(" - ") ? site.name.split(" - ").slice(1).join(" - ") || site.name : site.name,
        rooms: site.rooms,
      })),
    [siteRows]
  );

  const roleData = useMemo(
    () => [
      { name: "Providers", value: userList.filter((u) => u.role === "Provider").length, color: "#7ba3c0" },
      { name: "Nurses", value: userList.filter((u) => u.role === "Nurse").length, color: "#a9d4b8" },
      { name: "Front Desk", value: userList.filter((u) => u.role === "FrontDesk").length, color: "#e8c9a9" },
      { name: "Admin", value: userList.filter((u) => u.role === "Admin").length, color: "#c4b5e8" },
    ],
    [userList]
  );

  const totalRooms = useMemo(() => siteRows.reduce((sum, site) => sum + site.rooms, 0), [siteRows]);

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
          title="Total Rooms"
          value={loading ? "—" : totalRooms}
          icon={Calendar}
          color="bg-[#e8c9a9]/20"
          subtitle="Available capacity"
        />
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
