import { useEffect, useState } from "react";
import { Plus, Clock } from "lucide-react";
import { meApi } from "../../../api/authApi";
import {
  createAvailabilityTemplate,
  fetchAvailabilityTemplates,
  type AvailabilityTemplateDto,
  updateAvailabilityTemplate,
} from "../../../api/availabilityApi";
import {
  assignServiceToProvider,
  fetchServices,
  fetchServicesByProvider,
  removeServiceFromProvider,
  type SiteDto,
  fetchSites,
  type ServiceDto,
  type ProviderServiceMappingDto,
} from "../../../api/masterdataApi";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  searchAvailabilityBlocks,
  type AvailabilityBlockDto,
} from "../../../api/providerSchedulingApi";
import { generateSlotsFromTemplate } from "../../../api/slotsApi";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ProviderAvailability() {
  const [activeTab, setActiveTab] = useState<"templates" | "blocks" | "services">("templates");
  const [showModal, setShowModal] = useState(false);
  const [templates, setTemplates] = useState<AvailabilityTemplateDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [blocks, setBlocks] = useState<AvailabilityBlockDto[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceMappingDto[]>([]);
  const [allServices, setAllServices] = useState<ServiceDto[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");
  const [editDuration, setEditDuration] = useState("15");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState<"create" | "view" | "edit">("create");
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [blockDate, setBlockDate] = useState(new Date().toISOString().slice(0, 10));
  const [blockStartTime, setBlockStartTime] = useState("12:00");
  const [blockEndTime, setBlockEndTime] = useState("13:00");
  const [blockReason, setBlockReason] = useState("Provider block");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [form, setForm] = useState({
    dayOfWeek: 1,
    siteId: 0,
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMin: 15,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!me.userId) {
          if (!cancelled) {
            setTemplates([]);
            setBlocks([]);
            setProviderServices([]);
            setAllServices([]);
          }
          return;
        }
        const siteList = await fetchSites({ page: 1, pageSize: 250 });
        if (cancelled) return;
        setProviderId(me.userId);
        setSites(siteList);
        const [svcMap, svcList]: [ProviderServiceMappingDto[], ServiceDto[]] = await Promise.all([
          fetchServicesByProvider(me.userId).catch(() => [] as ProviderServiceMappingDto[]),
          fetchServices().catch(() => [] as ServiceDto[]),
        ]);
        if (!cancelled) {
          setProviderServices(svcMap);
          setAllServices(svcList);
        }
        const firstSiteId = siteList[0]?.siteId ?? 0;
        setForm((prev) => ({ ...prev, siteId: firstSiteId }));

        const grouped = await Promise.all(
          siteList.map((s) => fetchAvailabilityTemplates(me.userId, s.siteId))
        );
        if (cancelled) return;
        setTemplates(grouped.flat());
        if (firstSiteId) {
          const blockList = await searchAvailabilityBlocks(me.userId, firstSiteId);
          if (!cancelled) setBlocks(blockList);
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setBlocks([]);
          setProviderServices([]);
          setAllServices([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viewRows = templates.map((template) => ({
    id: template.templateId,
    day: DAY_LABELS[template.dayOfWeek] ?? `Day ${template.dayOfWeek}`,
    site: sites.find((s) => s.siteId === template.siteId)?.name ?? "Unknown Site",
    startTime: template.startTime,
    endTime: template.endTime,
    slotDuration: template.slotDurationMin,
  }));

  const handleCreate = async () => {
    if (!providerId || !form.siteId) return;
    setIsCreating(true);
    try {
      const id = await createAvailabilityTemplate({
        providerId,
        siteId: form.siteId,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        slotDurationMin: form.slotDurationMin,
      });
      setTemplates((prev) => [
        ...prev,
        {
          templateId: id,
          providerId,
          siteId: form.siteId,
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime: form.endTime,
          slotDurationMin: form.slotDurationMin,
          status: "Active",
        },
      ]);
      setShowModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async (templateId: number) => {
    const template = templates.find((t) => t.templateId === templateId);
    if (!template || !providerId) return;
    const startTime = editStartTime;
    const endTime = editEndTime;
    const duration = editDuration;
    if (!startTime || !endTime || !duration) return;
    await updateAvailabilityTemplate(templateId, {
      providerId,
      siteId: template.siteId,
      dayOfWeek: template.dayOfWeek,
      startTime,
      endTime,
      slotDurationMin: Number(duration),
      status: template.status,
    });
    setTemplates((prev) =>
      prev.map((t) =>
        t.templateId === templateId
          ? { ...t, startTime, endTime, slotDurationMin: Number(duration) }
          : t
      )
    );
    setEditingTemplateId(null);
  };

  const handleGenerateSlots = async (templateId: number, siteId: number) => {
    await generateSlotsFromTemplate({ templateId, siteId, days: 14 });
  };

  const openCreateTemplateModal = () => setShowModal(true);
  const closeCreateTemplateModal = () => setShowModal(false);

  const startEditTemplate = (templateId: number) => {
    const current = templates.find((t) => t.templateId === templateId);
    if (!current) return;
    setEditingTemplateId(templateId);
    setEditStartTime(current.startTime);
    setEditEndTime(current.endTime);
    setEditDuration(String(current.slotDurationMin));
  };

  const openBlockModal = () => {
    setBlockModalMode("create");
    setSelectedBlockId(null);
    setBlockDate(new Date().toISOString().slice(0, 10));
    setBlockStartTime("12:00");
    setBlockEndTime("13:00");
    setBlockReason("Provider block");
    setShowBlockModal(true);
  };

  const closeBlockModal = () => setShowBlockModal(false);

  const refreshBlocks = async (siteId: number) => {
    if (!providerId || !siteId) return;
    const blockList = await searchAvailabilityBlocks(providerId, siteId);
    setBlocks(blockList);
  };

  const addBlockFromModal = async () => {
    if (!providerId || !form.siteId || !blockDate || !blockStartTime || !blockEndTime) return;
    if (blockModalMode === "edit" && selectedBlockId != null) {
      // Backend has no update endpoint for blocks, so replace old one.
      await deleteAvailabilityBlock(selectedBlockId);
    }
    await createAvailabilityBlock({
      providerId,
      siteId: form.siteId,
      date: blockDate,
      startTime: blockStartTime,
      endTime: blockEndTime,
      reason: blockReason || "Provider block",
    });
    await refreshBlocks(form.siteId);
    setShowBlockModal(false);
  };

  const deleteBlockRow = async (blockId: number) => {
    await deleteAvailabilityBlock(blockId);
    if (providerId && form.siteId) {
      await refreshBlocks(form.siteId);
    }
  };

  const viewBlockRow = (block: AvailabilityBlockDto) => {
    setBlockModalMode("view");
    setSelectedBlockId(block.blockId);
    setBlockDate(block.date);
    setBlockStartTime(block.startTime);
    setBlockEndTime(block.endTime);
    setBlockReason(block.reason || "Provider block");
    setShowBlockModal(true);
  };

  const editBlockRow = (block: AvailabilityBlockDto) => {
    setBlockModalMode("edit");
    setSelectedBlockId(block.blockId);
    setBlockDate(block.date);
    setBlockStartTime(block.startTime);
    setBlockEndTime(block.endTime);
    setBlockReason(block.reason || "Provider block");
    setShowBlockModal(true);
  };

  const openServiceModal = () => {
    setNewServiceId("");
    setShowServiceModal(true);
  };

  const closeServiceModal = () => setShowServiceModal(false);

  const addProviderServiceFromModal = async () => {
    if (!providerId) return;
    const serviceId = Number(newServiceId);
    if (!serviceId) return;
    await assignServiceToProvider({ providerId, serviceId });
    const svcMap = await fetchServicesByProvider(providerId);
    setProviderServices(svcMap as ProviderServiceMappingDto[]);
    setShowServiceModal(false);
  };

  const removeProviderServiceRow = async (psid: number) => {
    await removeServiceFromProvider(psid);
    if (providerId) {
      const svcMap = await fetchServicesByProvider(providerId);
      setProviderServices(svcMap as ProviderServiceMappingDto[]);
    }
  };

  const closeEditTemplateModal = () => setEditingTemplateId(null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Availability Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your working hours and availability templates</p>
      </div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab("templates")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "templates" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Templates</button>
        <button onClick={() => setActiveTab("blocks")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "blocks" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Blocks</button>
        <button onClick={() => setActiveTab("services")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "services" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Provider Services</button>
      </div>

      <div className="bg-card rounded-xl border border-border">
        {activeTab === "templates" && (
        <div className="p-5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Weekly Templates</p>
          <button
            onClick={openCreateTemplateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>
        )}

        <div className="p-5">
          {activeTab === "templates" && <div className="space-y-3">
            {viewRows.map((template) => (
              <div key={template.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#7ba3c0]/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-[#7ba3c0]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{template.day}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.site}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.startTime} - {template.endTime} • {template.slotDuration} min slots
                      </p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <span onClick={() => startEditTemplate(template.id)}>
                      Edit
                    </span>
                  </button>
                  <button
                    onClick={() => handleGenerateSlots(template.id, templates.find((t) => t.templateId === template.id)?.siteId ?? form.siteId)}
                    className="ml-2 px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary"
                  >
                    Generate Slots
                  </button>
                </div>
              </div>
            ))}
          </div>}
          {activeTab === "blocks" && <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Availability Blocks</p>
            <div className="mb-3 max-w-xs">
              <label className="block text-xs text-muted-foreground mb-1">Site</label>
              <select
                value={form.siteId}
                onChange={(e) => {
                  const siteId = Number(e.target.value);
                  setForm((prev) => ({ ...prev, siteId }));
                  void refreshBlocks(siteId);
                }}
                className="w-full px-3 py-2 rounded border border-border bg-input-background text-sm"
              >
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={openBlockModal}
              className="mb-3 px-3 py-2 text-sm rounded bg-primary text-primary-foreground"
            >
              Add Block
            </button>
            <div className="space-y-2">
              {blocks.map((b) => (
                <div key={b.blockId} className="flex items-center justify-between p-2 rounded border border-border">
                  <span className="text-xs text-muted-foreground">
                    {b.date} {b.startTime}-{b.endTime} ({b.reason || "Provider block"})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewBlockRow(b)}
                      className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary"
                    >
                      View
                    </button>
                    <button
                      onClick={() => editBlockRow(b)}
                      className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteBlockRow(b.blockId)}
                      className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {activeTab === "services" && <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Provider Services</p>
            <button
              onClick={openServiceModal}
              className="mb-3 px-3 py-2 text-sm rounded bg-primary text-primary-foreground"
            >
              Add Service to Me
            </button>
            <div className="space-y-2">
              {providerServices.map((ps) => (
                <div key={ps.psid} className="flex items-center justify-between p-2 rounded border border-border">
                  <span className="text-xs text-muted-foreground">
                    #{ps.serviceId} {ps.serviceName} ({ps.status})
                  </span>
                  <button
                    onClick={() => void removeProviderServiceRow(ps.psid)}
                    className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Add Availability Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Day of Week</label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DAY_LABELS.map((label, idx) => (
                    <option key={label} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                <select
                  value={form.siteId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, siteId: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Slot Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={form.slotDurationMin}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slotDurationMin: Number(e.target.value) || 15 }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeCreateTemplateModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingTemplateId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Template</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-foreground mb-1.5">Slot Duration (minutes)</label>
              <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeEditTemplateModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
              <button onClick={() => handleEdit(editingTemplateId)} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
      {showBlockModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">
              {blockModalMode === "create" ? "Add Block" : blockModalMode === "edit" ? "Edit Block" : "View Block"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                <input type="date" disabled={blockModalMode === "view"} value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" disabled={blockModalMode === "view"} value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input type="time" disabled={blockModalMode === "view"} value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <input
                  type="text"
                  disabled={blockModalMode === "view"}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeBlockModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
              {blockModalMode !== "view" && (
                <button
                  onClick={() => void addBlockFromModal()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  {blockModalMode === "edit" ? "Save Changes" : "Add"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showServiceModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Add Service</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Service</label>
            <select
              value={newServiceId}
              onChange={(e) => setNewServiceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            >
              <option value="">Select service</option>
              {allServices.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>
                  {service.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3 mt-6">
              <button onClick={closeServiceModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
              <button
                onClick={() => void addProviderServiceFromModal()}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
