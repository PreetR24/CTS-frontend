import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, MapPin } from "lucide-react";
import {
  activateSite,
  createSite,
  deactivateSite,
  fetchRooms,
  fetchSites,
  getSiteById,
  updateSite,
} from "../../../api/masterdataApi";
import { mapSiteRows, type AdminSiteRow } from "../../../api/adminViewMappers";

export default function AdminSites() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [sites, setSites] = useState<AdminSiteRow[]>([]);
  const [editSiteId, setEditSiteId] = useState<number | null>(null);
  const [editSiteName, setEditSiteName] = useState("");
  const [editSiteAddress, setEditSiteAddress] = useState("");
  const [editSiteTimezone, setEditSiteTimezone] = useState("Asia/Kolkata");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newSiteTimezone, setNewSiteTimezone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [siteList, roomList] = await Promise.all([
          fetchSites({ page: 1, pageSize: 250 }),
          fetchRooms({ page: 1, pageSize: 500 }),
        ]);
        if (!cancelled) setSites(mapSiteRows(siteList, roomList));
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
  const closeCreateModal = () => setShowModal(false);
  const openEditModal = async (siteId: number, siteName: string, siteLocation: string) => {
    const detail = await getSiteById(siteId);
    setEditSiteId(siteId);
    setEditSiteName(siteName);
    setEditSiteAddress(siteLocation === "—" ? "" : siteLocation);
    setEditSiteTimezone(detail.timezone || "Asia/Kolkata");
    setShowEditModal(true);
  };
  const closeEditModal = () => setShowEditModal(false);

  const deactivateSiteRow = async (siteId: number) => {
    await deactivateSite(siteId);
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status: "Inactive" } : s)));
  };

  const activateSiteRow = async (siteId: number) => {
    await activateSite(siteId);
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status: "Active" } : s)));
  };

  const createSiteFromModal = async () => {
    if (!newSiteName.trim()) return;
    const created = await createSite({
      name: newSiteName.trim(),
      addressJson: newSiteAddress.trim() || undefined,
      timezone: newSiteTimezone,
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
    setNewSiteName("");
    setNewSiteAddress("");
    setNewSiteTimezone("Asia/Kolkata");
    setShowModal(false);
  };

  const saveEditedSite = async () => {
    if (editSiteId == null || !editSiteName.trim()) return;
    const updated = await updateSite(editSiteId, {
      name: editSiteName.trim(),
      addressJson: editSiteAddress.trim() || undefined,
      timezone: editSiteTimezone,
    });
    setSites((prev) =>
      prev.map((s) =>
        s.id === editSiteId
          ? { ...s, name: updated.name, location: updated.addressJson ?? "—", status: updated.status }
          : s
      )
    );
    setShowEditModal(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage clinic locations</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
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
                        <p className="text-xs text-muted-foreground">ID: {site.id}</p>
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Site Name</label>
                <input
                  type="text"
                  placeholder="Apollo Clinic - Location"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Address</label>
                <input
                  type="text"
                  placeholder="Street, Area, City"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
                  <select
                    value={newSiteTimezone}
                    onChange={(e) => setNewSiteTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option>Asia/Kolkata</option>
                    <option>Asia/Dubai</option>
                  </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void createSiteFromModal()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Create Site
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editSiteId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Site</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Site Name</label>
            <input
              type="text"
              value={editSiteName}
              onChange={(e) => setEditSiteName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Address</label>
            <input
              type="text"
              value={editSiteAddress}
              onChange={(e) => setEditSiteAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Timezone</label>
            <select
              value={editSiteTimezone}
              onChange={(e) => setEditSiteTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Asia/Kolkata</option>
              <option>Asia/Dubai</option>
            </select>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveEditedSite()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
