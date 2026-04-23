import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Activity } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import {
  activateService,
  createService,
  deactivateService,
  fetchServices,
  getServiceById,
  updateService,
} from "../../../api/masterdataApi";
import { mapServiceRow, type AdminServiceRow } from "../../../api/adminViewMappers";

type CreateServiceFormValues = {
  name: string;
  visitType: string;
};

type EditServiceFormValues = {
  name: string;
  visitType: string;
  defaultDurationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
};

export default function AdminServices() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    formState: { errors: createErrors },
  } = useForm<CreateServiceFormValues>({
    defaultValues: { name: "", visitType: "New" },
  });
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<EditServiceFormValues>({
    defaultValues: {
      name: "",
      visitType: "New",
      defaultDurationMin: 30,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

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

  const filteredServices = useMemo(
    () =>
      services.filter(
        (s) =>
          (filterStatus === "All" || s.status === filterStatus) &&
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [services, filterStatus, searchQuery]
  );

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => {
    setShowModal(false);
    resetCreateForm({ name: "", visitType: "New" });
  };
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };
  const openEditModal = async (serviceId: number) => {
    try {
      setActionError(null);
      const detail = await getServiceById(serviceId);
      setEditServiceId(serviceId);
      resetEditForm({
        name: detail.name,
        visitType: detail.visitType,
        defaultDurationMin: detail.defaultDurationMin,
        bufferBeforeMin: detail.bufferBeforeMin,
        bufferAfterMin: detail.bufferAfterMin,
      });
      setShowEditModal(true);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not load service details."));
    }
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditServiceId(null);
  };

  const deactivateServiceRow = async (serviceId: number) => {
    try {
      setActionError(null);
      await deactivateService(serviceId);
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, status: "Inactive" } : s))
      );
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not deactivate service."));
    }
  };

  const activateServiceRow = async (serviceId: number) => {
    try {
      setActionError(null);
      await activateService(serviceId);
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, status: "Active" } : s))
      );
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not activate service."));
    }
  };

  const createServiceFromModal = async (values: CreateServiceFormValues) => {
    try {
      setActionError(null);
      const created = await createService({ name: values.name.trim(), visitType: values.visitType.trim() });
      setServices((prev) => [...prev, mapServiceRow(created)]);
      closeCreateModal();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not create service."));
    }
  };

  const saveEditedService = async (values: EditServiceFormValues) => {
    if (editServiceId == null) return;
    try {
      setActionError(null);
      await updateService(editServiceId, {
        name: values.name.trim(),
        visitType: values.visitType,
        defaultDurationMin: values.defaultDurationMin,
        bufferBeforeMin: values.bufferBeforeMin,
        bufferAfterMin: values.bufferAfterMin,
      });
      const refreshed = await fetchServices();
      setServices((prev) =>
        prev.map((s) => {
          const latest = refreshed.find((r) => r.serviceId === s.id);
          return latest ? mapServiceRow(latest) : s;
        })
      );
      closeEditModal();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update service."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage clinic services and consultation types</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
        {actionError && <p className="text-sm text-destructive mt-2">{actionError}</p>}
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
                        onClick={() => void openEditModal(service.id)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {service.status === "Active" ? (
                        <button
                          className="text-xs px-2 py-1 border border-border rounded text-destructive"
                          onClick={() => void deactivateServiceRow(service.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => void activateServiceRow(service.id)}
                          className="text-xs px-2 py-1 border border-border rounded"
                        >
                          Activate
                        </button>
                      )}
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
            <form className="space-y-4" onSubmit={handleCreateSubmit(createServiceFromModal)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Service Name</label>
                <input
                  type="text"
                  placeholder="e.g., General Consultation"
                  {...registerCreate("name", {
                    required: "Service name is required.",
                    validate: (value) =>
                      value.trim().length > 0 || "Service name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.name && <p className="text-xs text-destructive mt-1">{createErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Visit Type</label>
                <select
                  {...registerCreate("visitType", {
                    required: "Visit type is required.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>New</option>
                  <option>FollowUp</option>
                  <option>Procedure</option>
                </select>
                {createErrors.visitType && <p className="text-xs text-destructive mt-1">{createErrors.visitType.message}</p>}
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
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editServiceId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Service</h3>
            <form onSubmit={handleEditSubmit(saveEditedService)}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Service Name</label>
              <input
                type="text"
                {...registerEdit("name", {
                  required: "Service name is required.",
                  validate: (value) =>
                    value.trim().length > 0 || "Service name cannot be empty.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.name && <p className="text-xs text-destructive mt-1">{editErrors.name.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Visit Type</label>
              <select
                {...registerEdit("visitType", {
                  required: "Visit type is required.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>New</option>
                <option>FollowUp</option>
                <option>Procedure</option>
              </select>
              {editErrors.visitType && <p className="text-xs text-destructive mt-1">{editErrors.visitType.message}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-foreground mb-1">Duration (min)</label>
                  <input
                    type="number"
                    {...registerEdit("defaultDurationMin", {
                      valueAsNumber: true,
                      min: { value: 0, message: "Duration cannot be negative." },
                    })}
                    className="w-full min-w-0 px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                    placeholder="Duration"
                  />
                  {editErrors.defaultDurationMin && <p className="text-xs text-destructive mt-1">{editErrors.defaultDurationMin.message}</p>}
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-foreground mb-1">Buffer Before (min)</label>
                  <input
                    type="number"
                    {...registerEdit("bufferBeforeMin", {
                      valueAsNumber: true,
                      min: { value: 0, message: "Buffer cannot be negative." },
                    })}
                    className="w-full min-w-0 px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                    placeholder="Buffer before"
                  />
                  {editErrors.bufferBeforeMin && <p className="text-xs text-destructive mt-1">{editErrors.bufferBeforeMin.message}</p>}
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-foreground mb-1">Buffer After (min)</label>
                  <input
                    type="number"
                    {...registerEdit("bufferAfterMin", {
                      valueAsNumber: true,
                      min: { value: 0, message: "Buffer cannot be negative." },
                    })}
                    className="w-full min-w-0 px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                    placeholder="Buffer after"
                  />
                  {editErrors.bufferAfterMin && <p className="text-xs text-destructive mt-1">{editErrors.bufferAfterMin.message}</p>}
                </div>
              </div>
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
