import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin } from "lucide-react";
import { fetchRooms, fetchSites } from "../../../api/masterdataApi";
import { mapSiteRows, type AdminSiteRow } from "../../../api/adminViewMappers";

export default function AdminSites() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sites, setSites] = useState<AdminSiteRow[]>([]);
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

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Sites & Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage clinic locations and room inventory</p>
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
          <button
            onClick={() => setShowModal(true)}
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
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Total Rooms</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7ba3c0]/10 text-sm font-medium text-foreground">
                      {site.rooms} rooms
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#a9d4b8]/30 text-xs font-medium text-foreground">
                      {site.status}
                    </span>
                  </td>
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
              {!loading && filteredSites.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-sm text-muted-foreground text-center">
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
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Address</label>
                <input
                  type="text"
                  placeholder="Street, Area, City"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Number of Rooms</label>
                  <input
                    type="number"
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
                  <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Asia/Kolkata</option>
                    <option>Asia/Dubai</option>
                  </select>
                </div>
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
                Create Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
