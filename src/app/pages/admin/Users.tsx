import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";
import { fetchProviders } from "../../../api/masterdataApi";
import { buildProviderSpecialtyMap, mapUserRows, type AdminUserRow } from "../../../api/adminViewMappers";
import { fetchUsers } from "../../../api/usersApi";

export default function AdminUsers() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [userList, providerList] = await Promise.all([
          fetchUsers({ page: 1, pageSize: 500 }),
          fetchProviders(),
        ]);
        if (!cancelled) {
          const specMap = buildProviderSpecialtyMap(providerList);
          setRows(mapUserRows(userList, specMap));
        }
      } catch {
        if (!cancelled) setLoadError("Could not load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(
    () =>
      rows.filter(
        (u) =>
          (filterRole === "All" || u.role === filterRole) &&
          (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [rows, filterRole, searchQuery]
  );

  const roleColors: Record<string, string> = {
    Admin: "#c4b5e8",
    Provider: "#7ba3c0",
    FrontDesk: "#e8c9a9",
    Nurse: "#a9d4b8",
    Patient: "#e8b8d4",
    Operations: "#b8d4e8",
    Tech: "#d4e8b8",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all system users and role assignments</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>All</option>
              <option>Admin</option>
              <option>Provider</option>
              <option>FrontDesk</option>
              <option>Nurse</option>
              <option>Operations</option>
              <option>Patient</option>
              <option>Tech</option>
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Specialty/Dept</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${roleColors[user.role] ?? "#a0a0a0"}30` }}
                      >
                        <User className="w-5 h-5" style={{ color: roleColors[user.role] ?? "#a0a0a0" }} />
                      </div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span 
                      className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium text-white"
                      style={{ backgroundColor: roleColors[user.role] ?? "#a0a0a0" }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{user.specialty || "-"}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg">
            <h3 className="text-base font-medium text-foreground mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Firstname Lastname"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Provider</option>
                  <option>Nurse</option>
                  <option>FrontDesk</option>
                  <option>Tech</option>
                  <option>Operations</option>
                  <option>Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="user@careschedule.in"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
