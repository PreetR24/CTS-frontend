import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, MapPin } from "lucide-react";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import {
  activateSite,
  createSite,
  deactivateSite,
  fetchSites,
  getSiteById,
  updateSite,
} from "../../../api/masterdataApi";
import type { AdminSiteRow } from "../../../api/adminViewMappers";

type SiteFormValues = {
  name: string;
  address: string;
  timezone: string;
};

export default function AdminSites() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [sites, setSites] = useState<AdminSiteRow[]>([]);
  const [editSiteId, setEditSiteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    formState: { errors: createErrors },
  } = useForm<SiteFormValues>({
    defaultValues: {
      name: "",
      address: "",
      timezone: "Asia/Kolkata",
    },
  });
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<SiteFormValues>({
    defaultValues: {
      name: "",
      address: "",
      timezone: "Asia/Kolkata",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const siteList = await fetchSites({ page: 1, pageSize: 250 });
        if (!cancelled) {
          setSites(
            siteList.map((s) => ({
              id: s.siteId,
              name: s.name,
              location: s.addressJson ?? "—",
              rooms: 0,
              status: s.status,
            }))
          );
        }
      } catch {
        if (!cancelled) setLoadError("Could not load sites.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSites = useMemo(
    () =>
      sites.filter(
        (site) =>
          (filterStatus === "All" || site.status === filterStatus) &&
          (site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            site.location.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [sites, filterStatus, searchQuery]
  );

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => {
    setShowModal(false);
    resetCreateForm({ name: "", address: "", timezone: "Asia/Kolkata" });
  };
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };
  const openEditModal = async (siteId: number, siteName: string, siteLocation: string) => {
    try {
      setActionMessage(null);
      const detail = await getSiteById(siteId);
      setEditSiteId(siteId);
      resetEditForm({
        name: siteName,
        address: siteLocation === "—" ? "" : siteLocation,
        timezone: detail.timezone || "Asia/Kolkata",
      });
      setShowEditModal(true);
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not load site details."));
    }
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditSiteId(null);
  };

  const deactivateSiteRow = async (siteId: number) => {
    try {
      setActionMessage(null);
      await deactivateSite(siteId);
      setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status: "Inactive" } : s)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not deactivate this site.";
      setActionMessage(`Site not deactivated. Reason: ${msg}`);
    }
  };

  const activateSiteRow = async (siteId: number) => {
    try {
      setActionMessage(null);
      await activateSite(siteId);
      setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status: "Active" } : s)));
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not activate site."));
    }
  };

  const createSiteFromModal = async (values: SiteFormValues) => {
    try {
      setActionMessage(null);
      const created = await createSite({
        name: values.name.trim(),
        addressJson: values.address.trim() || undefined,
        timezone: values.timezone,
      });
      setSites((prev) => [
        ...prev,
        {
          id: created.siteId,
          name: created.name,
          location: created.addressJson ?? "N/A",
          rooms: 0,
          status: created.status,
        },
      ]);
      closeCreateModal();
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not create site."));
    }
  };

  const saveEditedSite = async (values: SiteFormValues) => {
    if (editSiteId == null) return;
    try {
      setActionMessage(null);
      const updated = await updateSite(editSiteId, {
        name: values.name.trim(),
        addressJson: values.address.trim() || undefined,
        timezone: values.timezone,
      });
      setSites((prev) =>
        prev.map((s) =>
          s.id === editSiteId
            ? { ...s, name: updated.name, location: updated.addressJson ?? "—", status: updated.status }
            : s
        )
      );
      closeEditModal();
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not update site."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage clinic locations</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
        {actionMessage && <p className="text-sm text-destructive mt-2">{actionMessage}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>All</option>
          </select>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Site
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Location</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filteredSites.map((site) => (
                <tr key={site.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#c4b5e8]/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#c4b5e8]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{site.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{site.location}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#a9d4b8]/30 text-xs font-medium text-foreground">
                      {site.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        onClick={() => void openEditModal(site.id, site.name, site.location)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {site.status === "Active" ? (
                        <button
                          className="text-xs px-2 py-1 border border-border rounded text-destructive"
                          onClick={() => void deactivateSiteRow(site.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => void activateSiteRow(site.id)}
                          className="text-xs px-2 py-1 border border-border rounded"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredSites.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    No sites found.
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
            <h3 className="text-base font-medium text-foreground mb-4">Add New Site</h3>
            <form className="space-y-4" onSubmit={handleCreateSubmit(createSiteFromModal)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Site Name</label>
                <input
                  type="text"
                  placeholder="Apollo Clinic - Location"
                  {...registerCreate("name", {
                    required: "Site name is required.",
                    validate: (value) =>
                      value.trim().length > 0 || "Site name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.name && <p className="text-xs text-destructive mt-1">{createErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Address</label>
                <input
                  type="text"
                  placeholder="Street, Area, City"
                  {...registerCreate("address", {
                    maxLength: { value: 500, message: "Address is too long." },
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.address && <p className="text-xs text-destructive mt-1">{createErrors.address.message}</p>}
              </div>
              <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
                  <select
                    {...registerCreate("timezone", {
                      required: "Timezone is required.",
                    })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option>Asia/Kolkata</option>
                    <option>Asia/Dubai</option>
                  </select>
                  {createErrors.timezone && <p className="text-xs text-destructive mt-1">{createErrors.timezone.message}</p>}
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
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editSiteId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Site</h3>
            <form onSubmit={handleEditSubmit(saveEditedSite)}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Site Name</label>
              <input
                type="text"
                {...registerEdit("name", {
                  required: "Site name is required.",
                  validate: (value) =>
                    value.trim().length > 0 || "Site name cannot be empty.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.name && <p className="text-xs text-destructive mt-1">{editErrors.name.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Address</label>
              <input
                type="text"
                {...registerEdit("address", {
                  maxLength: { value: 500, message: "Address is too long." },
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.address && <p className="text-xs text-destructive mt-1">{editErrors.address.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Timezone</label>
              <select
                {...registerEdit("timezone", {
                  required: "Timezone is required.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>Asia/Kolkata</option>
                <option>Asia/Dubai</option>
              </select>
              {editErrors.timezone && <p className="text-xs text-destructive mt-1">{editErrors.timezone.message}</p>}
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
