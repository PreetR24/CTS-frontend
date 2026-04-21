import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { Building2, Users, Calendar, Activity, Plus, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fetchRooms, fetchServices, fetchSites } from "../../api/masterdataApi";
import { fetchUsers } from "../../api/usersApi";
import {
  mapServiceRow,
  mapSiteRows,
  mapUserRows,
  type AdminServiceRow,
  type AdminSiteRow,
  type AdminUserRow,
} from "../../api/adminViewMappers";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"sites" | "users" | "services">("sites");
  const [showModal, setShowModal] = useState(false);
  const [siteRows, setSiteRows] = useState<AdminSiteRow[]>([]);
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [serviceRows, setServiceRows] = useState<AdminServiceRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sites, rooms, userDtos, services] = await Promise.all([
          fetchSites({ page: 1, pageSize: 250 }),
          fetchRooms({ page: 1, pageSize: 500 }),
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchServices(),
        ]);
        if (cancelled) return;
        setSiteRows(mapSiteRows(sites, rooms));
        setUserRows(mapUserRows(userDtos));
        setServiceRows(services.map(mapServiceRow));
      } catch {
        if (!cancelled) {
          setSiteRows([]);
          setUserRows([]);
          setServiceRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = [
    { id: "sites", label: "Sites & Rooms" },
    { id: "users", label: "Users & Staff" },
    { id: "services", label: "Services" },
  ];

  const siteData = siteRows.map((site) => ({
    name: site.name.includes(" - ") ? site.name.split(" - ")[1] ?? site.name : site.name,
    rooms: site.rooms,
  }));

  const roleData = [
    { name: "Providers", value: userRows.filter((u) => u.role === "Provider").length, color: "#a8c4d4" },
    { name: "Nurses", value: userRows.filter((u) => u.role === "Nurse").length, color: "#c4f0d4" },
    { name: "Front Desk", value: userRows.filter((u) => u.role === "FrontDesk").length, color: "#f5e6d3" },
    { name: "Admin", value: userRows.filter((u) => u.role === "Admin").length, color: "#d4c4f0" },
  ];

  const totalRooms = siteRows.reduce((sum, site) => sum + site.rooms, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Admin Dashboard" userName="Vikram Singh" userRole="Administrator" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Sites"
            value={siteRows.length}
            icon={Building2}
            color="bg-[#d4c4f0]/20"
            subtitle="Across India"
          />
          <StatCard
            title="Active Users"
            value={userRows.length}
            icon={Users}
            color="bg-[#a8c4d4]/20"
            subtitle="All roles"
          />
          <StatCard
            title="Services Offered"
            value={serviceRows.length}
            icon={Activity}
            color="bg-[#c4f0d4]/20"
            subtitle="Active services"
          />
          <StatCard
            title="Total Rooms"
            value={totalRooms}
            icon={Calendar}
            color="bg-[#f5d4c4]/20"
            subtitle="Available capacity"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Rooms by Site</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={siteData}>
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
                <Bar dataKey="rooms" fill="#a8c4d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Staff Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
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

        <div className="bg-card rounded-xl border border-border">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "sites" | "users" | "services")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>

          <div className="p-5">
            {activeTab === "sites" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Location</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Rooms</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteRows.map((site) => (
                      <tr key={site.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{site.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{site.location}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{site.rooms}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-md bg-[#c4f0d4]/30 text-xs text-foreground">
                            {site.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Phone</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{user.name}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-md bg-primary/20 text-xs text-foreground">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{user.phone}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{user.status}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "services" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Service Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Visit Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Duration</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Buffer</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.map((service) => (
                      <tr key={service.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{service.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{service.visitType}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{service.duration} min</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{service.buffer} min</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-md bg-[#c4f0d4]/30 text-xs text-foreground">
                            {service.status}
                          </span>
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

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">
              Add New {activeTab === "sites" ? "Site" : activeTab === "users" ? "User" : "Service"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter name"
                />
              </div>
              {activeTab === "sites" && (
                <>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Location</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Number of Rooms</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter room count"
                    />
                  </div>
                </>
              )}
              {activeTab === "users" && (
                <>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Role</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Provider</option>
                      <option>Nurse</option>
                      <option>FrontDesk</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="email@example.com"
                    />
                  </div>
                </>
              )}
              {activeTab === "services" && (
                <>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Visit Type</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>New</option>
                      <option>FollowUp</option>
                      <option>Procedure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Duration (minutes)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="30"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
