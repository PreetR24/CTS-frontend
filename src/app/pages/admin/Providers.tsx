import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Stethoscope } from "lucide-react";
import { fetchProviders, fetchServicesByProvider } from "../../../api/masterdataApi";
import { mapProviderRows, type AdminProviderRow } from "../../../api/adminViewMappers";

export default function AdminProviders() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<AdminProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const list = await fetchProviders();
        const counts: Record<number, number> = {};
        await Promise.all(
          list.map(async (p) => {
            try {
              const svcs = await fetchServicesByProvider(p.providerId);
              counts[p.providerId] = svcs.length;
            } catch {
              counts[p.providerId] = 0;
            }
          })
        );
        if (!cancelled) setProviders(mapProviderRows(list, counts));
      } catch {
        if (!cancelled) setLoadError("Could not load providers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProviders = useMemo(
    () =>
      providers.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [providers, searchQuery]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage healthcare providers and their specialties</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search providers..."
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
            Add Provider
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Provider Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Specialty</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Services</th>
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
                filteredProviders.map((provider) => (
                <tr key={provider.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#7ba3c0]/20 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-[#7ba3c0]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {provider.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#c4b5e8]/20 text-xs font-medium text-foreground">
                      {provider.specialty ?? "—"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{provider.email}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {provider.serviceCount} service{provider.serviceCount === 1 ? "" : "s"}
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
              {!loading && filteredProviders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    No providers found.
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
            <h3 className="text-base font-medium text-foreground mb-4">Add New Provider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Dr. Firstname Lastname"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Specialty</label>
                <input
                  type="text"
                  placeholder="e.g., Cardiology, Pediatrics"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Credentials</label>
                <input
                  type="text"
                  placeholder="MBBS, MD"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="doctor@careschedule.in"
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
                Create Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
