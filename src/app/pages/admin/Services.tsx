import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Activity } from "lucide-react";
import {
  activateService,
  createService,
  deactivateService,
  fetchServices,
  updateService,
} from "../../../api/masterdataApi";
import { mapServiceRow, type AdminServiceRow } from "../../../api/adminViewMappers";

export default function AdminServices() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newVisitType, setNewVisitType] = useState("New");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const list = await fetchServices();
        if (!cancelled) setServices(list.map(mapServiceRow));
      } catch {
        if (!cancelled) setLoadError("Could not load services.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => setShowModal(false);
  const openEditModal = (serviceId: number, serviceName: string) => {
    setEditServiceId(serviceId);
    setEditServiceName(serviceName);
    setShowEditModal(true);
  };
  const closeEditModal = () => setShowEditModal(false);

  const deactivateServiceRow = async (serviceId: number) => {
    await deactivateService(serviceId);
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status: "Inactive" } : s))
    );
  };

  const activateServiceRow = async (serviceId: number) => {
    await activateService(serviceId);
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status: "Active" } : s))
    );
  };

  const createServiceFromModal = async () => {
    if (!newServiceName.trim() || !newVisitType.trim()) return;
    const created = await createService({ name: newServiceName.trim(), visitType: newVisitType.trim() });
    setServices((prev) => [...prev, mapServiceRow(created)]);
    setNewServiceName("");
    setNewVisitType("New");
    setShowModal(false);
  };

  const saveEditedService = async () => {
    if (editServiceId == null || !editServiceName.trim()) return;
    await updateService(editServiceId, { name: editServiceName.trim() });
    setServices((prev) =>
      prev.map((s) => (s.id === editServiceId ? { ...s, name: editServiceName.trim() } : s))
    );
    setShowEditModal(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage clinic services and consultation types</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Service Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Visit Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Buffer Time</th>
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
                filteredServices.map((service) => (
                <tr key={service.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#a9d4b8]/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-[#a9d4b8]" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{service.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#7ba3c0]/10 text-xs font-medium text-foreground">
                      {service.visitType}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{service.duration} min</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{service.buffer} min</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#a9d4b8]/30 text-xs font-medium text-foreground">
                      {service.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        onClick={() => openEditModal(service.id, service.name)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2
                          className="w-4 h-4 text-destructive"
                          onClick={() => void deactivateServiceRow(service.id)}
                        />
                      </button>
                      <button
                        onClick={() => void activateServiceRow(service.id)}
                        className="text-xs px-2 py-1 border border-border rounded"
                      >
                        Activate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredServices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-sm text-muted-foreground text-center">
                    No services found.
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
            <h3 className="text-base font-medium text-foreground mb-4">Add New Service</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Service Name</label>
                <input
                  type="text"
                  placeholder="e.g., General Consultation"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Visit Type</label>
                <select
                  value={newVisitType}
                  onChange={(e) => setNewVisitType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>New</option>
                  <option>FollowUp</option>
                  <option>Procedure</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Duration (min)</label>
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Buffer (min)</label>
                  <input
                    type="number"
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
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
                onClick={() => void createServiceFromModal()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Create Service
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editServiceId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Service</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Service Name</label>
            <input
              type="text"
              value={editServiceName}
              onChange={(e) => setEditServiceName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveEditedService()}
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
