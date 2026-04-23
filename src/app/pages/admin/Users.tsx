import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, User } from "lucide-react";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { mapUserRows, type AdminUserRow } from "../../../api/adminViewMappers";
import {
  activateUser,
  createUser,
  deactivateUser,
  fetchUsers,
  getUserById,
  updateUser,
} from "../../../api/usersApi";

export default function AdminUsers() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    watch: watchCreateForm,
    formState: { errors: createErrors },
  } = useForm<{ name: string; role: string; email: string; phone: string; specialty: string; credentials: string }>({
    defaultValues: { name: "", role: "Provider", email: "", phone: "", specialty: "", credentials: "" },
  });
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<{ name: string; email: string; phone: string }>({
    defaultValues: { name: "", email: "", phone: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const userList = await fetchUsers({ page: 1, pageSize: 500 });
        if (!cancelled) {
          setRows(mapUserRows(userList));
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
          (filterStatus === "All" || u.status === filterStatus) &&
          (filterRole === "All" || u.role === filterRole) &&
          (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [rows, filterStatus, filterRole, searchQuery]
  );

  const roleColors: Record<string, string> = {
    Admin: "#c4b5e8",
    Provider: "#7ba3c0",
    FrontDesk: "#e8c9a9",
    Nurse: "#a9d4b8",
    Patient: "#e8b8d4",
    Operations: "#b8d4e8",
  };

  const openCreateModal = () => setShowModal(true);

  const closeCreateModal = () => {
    setShowModal(false);
    resetCreateForm({ name: "", role: "Provider", email: "", phone: "", specialty: "", credentials: "" });
  };
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const openEditModal = async (userId: number) => {
    try {
      setActionError(null);
      const detail = await getUserById(userId);
      setEditUserId(userId);
      resetEditForm({ name: detail.name, email: detail.email, phone: detail.phone ?? "" });
      setShowEditModal(true);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not load user details."));
    }
  };

  const deactivateUserRow = async (userId: number) => {
    try {
      setActionError(null);
      await deactivateUser(userId);
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, status: "Inactive" } : r)));
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not deactivate user."));
    }
  };

  const activateUserRow = async (userId: number) => {
    try {
      setActionError(null);
      await activateUser(userId);
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, status: "Active" } : r)));
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not activate user."));
    }
  };

  const createUserFromModal = async (values: { name: string; role: string; email: string; phone: string; specialty: string; credentials: string }) => {
    try {
      setActionError(null);
      const created = await createUser({
        name: values.name.trim(),
        role: values.role,
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        specialty: values.role === "Provider" ? values.specialty.trim() || undefined : undefined,
        credentials: values.role === "Provider" ? values.credentials.trim() || undefined : undefined,
      });
      setRows((prev) => [
        ...prev,
        {
          id: created.userId,
          name: created.name,
          role: created.role,
          email: created.email,
          phone: created.phone ?? "-",
          status: created.status,
        },
      ]);
      closeCreateModal();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not create user."));
    }
  };
  const createRole = watchCreateForm("role");

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditUserId(null);
  };

  const saveEditedUser = async (values: { name: string; email: string; phone: string }) => {
    if (editUserId == null) return;
    try {
      setActionError(null);
      const updated = await updateUser(editUserId, {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === editUserId
            ? {
                ...r,
                name: updated.name,
                email: updated.email,
                phone: updated.phone ?? "-",
              }
            : r
        )
      );
      closeEditModal();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update user."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all system users and role assignments</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
        {actionError && <p className="text-sm text-destructive mt-2">{actionError}</p>}
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
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Active</option>
              <option>Inactive</option>
              <option>All</option>
            </select>
          </div>
          <button
            onClick={openCreateModal}
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
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-sm text-muted-foreground text-center">
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
                  <td className="py-4 px-4 text-sm text-muted-foreground">{user.phone}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{user.status}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => void openEditModal(user.id)}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {user.status === "Active" ? (
                        <button
                          className="text-xs px-2 py-1 border border-border rounded text-destructive"
                          onClick={() => void deactivateUserRow(user.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => void activateUserRow(user.id)}
                          className="text-xs px-2 py-1 border border-border rounded"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-sm text-muted-foreground text-center">
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
            <form className="space-y-4" onSubmit={handleCreateSubmit(createUserFromModal)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Firstname Lastname"
                  {...registerCreate("name", {
                    required: "Name is required.",
                    validate: (value) => value.trim().length > 0 || "Name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.name && <p className="text-xs text-destructive mt-1">{createErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select
                  {...registerCreate("role", { required: "Role is required." })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Provider</option>
                  <option>Nurse</option>
                  <option>FrontDesk</option>
                  <option>Operations</option>
                  <option>Admin</option>
                </select>
                {createErrors.role && <p className="text-xs text-destructive mt-1">{createErrors.role.message}</p>}
              </div>
              {createRole === "Provider" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g., Cardiology"
                      {...registerCreate("specialty")}
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Credentials</label>
                    <input
                      type="text"
                      placeholder="e.g., MBBS, MD"
                      {...registerCreate("credentials")}
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="user@careschedule.in"
                  {...registerCreate("email", {
                    required: "Email is required.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.email && <p className="text-xs text-destructive mt-1">{createErrors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  {...registerCreate("phone", {
                    pattern: {
                      value: /^[0-9+\-\s()]*$/,
                      message: "Phone can contain digits and + - ( ) only.",
                    },
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.phone && <p className="text-xs text-destructive mt-1">{createErrors.phone.message}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editUserId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit User</h3>
            <form onSubmit={handleEditSubmit(saveEditedUser)}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
              <input
                type="text"
                {...registerEdit("name", {
                  required: "Name is required.",
                  validate: (value) => value.trim().length > 0 || "Name cannot be empty.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.name && <p className="text-xs text-destructive mt-1">{editErrors.name.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Email</label>
              <input
                type="email"
                {...registerEdit("email", {
                  required: "Email is required.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address.",
                  },
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.email && <p className="text-xs text-destructive mt-1">{editErrors.email.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Phone</label>
              <input
                type="text"
                {...registerEdit("phone", {
                  pattern: {
                    value: /^[0-9+\-\s()]*$/,
                    message: "Phone can contain digits and + - ( ) only.",
                  },
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.phone && <p className="text-xs text-destructive mt-1">{editErrors.phone.message}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
