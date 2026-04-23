import { useEffect, useMemo, useState } from "react";
import { Plus, Clock, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { meApi } from "../../../api/authApi";
import { searchAppointments } from "../../../api/appointmentsApi";
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
  activateAvailabilityBlock,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  searchAvailabilityBlocks,
  type AvailabilityBlockDto,
} from "../../../api/providerSchedulingApi";
import { generateSlotsFromTemplate, searchOpenSlots, type SlotDto } from "../../../api/slotsApi";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export default function ProviderAvailability() {
  const [activeTab, setActiveTab] = useState<"templates" | "blocks" | "services" | "slots">("templates");
  const [showModal, setShowModal] = useState(false);
  const [templates, setTemplates] = useState<AvailabilityTemplateDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [blocks, setBlocks] = useState<AvailabilityBlockDto[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceMappingDto[]>([]);
  const [allServices, setAllServices] = useState<ServiceDto[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
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
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotStatusFilter, setSlotStatusFilter] = useState("All");
  const [slotRows, setSlotRows] = useState<
    Array<{
      key: string;
      date: string;
      startTime: string;
      endTime: string;
      siteId: number;
      serviceId: number;
      status: string;
      source: "Published slot" | "Booked appointment";
    }>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    siteId: 0,
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMin: 15,
  });
  const { register: registerTemplateCreate, handleSubmit: handleTemplateCreateSubmit, formState: { errors: templateCreateErrors } } =
    useForm<{ dayOfWeek: number; siteId: number; startTime: string; endTime: string; slotDurationMin: number }>();
  const { register: registerTemplateEdit, handleSubmit: handleTemplateEditSubmit, formState: { errors: templateEditErrors } } =
    useForm<{ startTime: string; endTime: string; slotDurationMin: number }>();
  const { register: registerBlock, handleSubmit: handleBlockSubmit, formState: { errors: blockErrors } } =
    useForm<{ date: string; startTime: string; endTime: string; reason: string }>();
  const { register: registerProviderService, handleSubmit: handleProviderServiceSubmit, formState: { errors: providerServiceErrors } } =
    useForm<{ serviceId: string }>();

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

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? fallback;
    if (error instanceof Error) return error.message;
    return fallback;
  };
  const activeServiceIds = useMemo(
    () => providerServices.filter((ps) => ps.status === "Active").map((ps) => ps.serviceId),
    [providerServices]
  );
  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    allServices.forEach((s) => map.set(s.serviceId, s.name));
    return map;
  }, [allServices]);
  const siteNameById = useMemo(() => {
    const map = new Map<number, string>();
    sites.forEach((s) => map.set(s.siteId, s.name));
    return map;
  }, [sites]);
  const filteredSlotRows = useMemo(
    () => slotRows.filter((row) => slotStatusFilter === "All" || row.status === slotStatusFilter),
    [slotRows, slotStatusFilter]
  );

  const loadMySlots = async (targetDate: string, targetSiteId: number) => {
    if (!providerId || !targetDate || !targetSiteId) {
      setSlotRows([]);
      return;
    }
    if (activeServiceIds.length === 0) {
      setSlotRows([]);
      return;
    }
    setLoadingSlots(true);
    try {
      setActionError(null);
      const openList = (
        await Promise.all(
          activeServiceIds.map((serviceId) =>
            searchOpenSlots({
              providerId,
              serviceId,
              siteId: targetSiteId,
              date: targetDate,
            }).catch(() => [] as SlotDto[])
          )
        )
      ).flat();

      const appointments = await searchAppointments({
        providerId,
        siteId: targetSiteId,
        date: targetDate,
      });

      const openRows = openList.map((slot) => ({
        key: `slot-${slot.pubSlotId}`,
        date: slot.slotDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        siteId: slot.siteId,
        serviceId: slot.serviceId,
        status: slot.status,
        source: "Published slot" as const,
      }));
      const bookedRows = appointments.map((apt) => ({
        key: `apt-${apt.appointmentId}`,
        date: apt.slotDate,
        startTime: apt.startTime,
        endTime: apt.endTime,
        siteId: apt.siteId,
        serviceId: apt.serviceId,
        status: apt.status,
        source: "Booked appointment" as const,
      }));
      const merged = [...openRows, ...bookedRows].sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      );
      setSlotRows(merged);
    } catch (error) {
      setSlotRows([]);
      setActionError(getErrorMessage(error, "Could not load my slots."));
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (providerId && form.siteId) {
      void loadMySlots(slotDate, form.siteId);
    }
  }, [providerId, form.siteId, slotDate, providerServices]);

  const handleCreate = async (values: { dayOfWeek: number; siteId: number; startTime: string; endTime: string; slotDurationMin: number }) => {
    if (!providerId || !values.siteId) return;
    if (values.endTime <= values.startTime) {
      setActionError("End time must be later than start time.");
      return;
    }
    setIsCreating(true);
    try {
      setActionError(null);
      const id = await createAvailabilityTemplate({
        providerId,
        siteId: values.siteId,
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        slotDurationMin: values.slotDurationMin,
      });
      setTemplates((prev) => [
        ...prev,
        {
          templateId: id,
          providerId,
          siteId: values.siteId,
          dayOfWeek: values.dayOfWeek,
          startTime: values.startTime,
          endTime: values.endTime,
          slotDurationMin: values.slotDurationMin,
          status: "Active",
        },
      ]);
      setShowModal(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not create template."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async (templateId: number, values: { startTime: string; endTime: string; slotDurationMin: number }) => {
    const template = templates.find((t) => t.templateId === templateId);
    if (!template || !providerId) return;
    if (values.endTime <= values.startTime) {
      setActionError("End time must be later than start time.");
      return;
    }
    try {
      setActionError(null);
      await updateAvailabilityTemplate(templateId, {
        providerId,
        siteId: template.siteId,
        dayOfWeek: template.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        slotDurationMin: Number(values.slotDurationMin),
        status: template.status,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.templateId === templateId
            ? { ...t, startTime: values.startTime, endTime: values.endTime, slotDurationMin: Number(values.slotDurationMin) }
            : t
        )
      );
      setEditingTemplateId(null);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update template."));
    }
  };

  const handleGenerateSlots = async (templateId: number, siteId: number) => {
    try {
      setActionError(null);
      setActionNotice(null);
      await generateSlotsFromTemplate({ templateId, siteId, days: 14 });
      setActionNotice("Slots generated successfully from template.");
      if (providerId && siteId) {
        await loadMySlots(slotDate, siteId);
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not generate slots."));
    }
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
    setActionError(null);
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

  const addBlockFromModal = async (values: { date: string; startTime: string; endTime: string; reason: string }) => {
    if (!providerId || !form.siteId || !values.date || !values.startTime || !values.endTime) return;
    const today = new Date().toISOString().slice(0, 10);
    if (values.date < today) {
      setActionError("Block date cannot be in the past.");
      return;
    }
    if (values.endTime <= values.startTime) {
      setActionError("Block end time must be later than start time.");
      return;
    }
    const nextStart = timeToMinutes(values.startTime);
    const nextEnd = timeToMinutes(values.endTime);
    const hasOverlap = blocks.some((b) => {
      if (blockModalMode === "edit" && selectedBlockId != null && b.blockId === selectedBlockId) return false;
      if (b.date !== values.date) return false;
      const currentStart = timeToMinutes(b.startTime);
      const currentEnd = timeToMinutes(b.endTime);
      return nextStart < currentEnd && currentStart < nextEnd;
    });
    if (hasOverlap) {
      setActionError("This block overlaps an existing block on the same date.");
      return;
    }
    try {
      setActionError(null);
      if (blockModalMode === "edit" && selectedBlockId != null) {
        await deleteAvailabilityBlock(selectedBlockId);
      }
      await createAvailabilityBlock({
        providerId,
        siteId: form.siteId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        reason: values.reason || "Provider block",
      });
      await refreshBlocks(form.siteId);
      setShowBlockModal(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not save block."));
    }
  };

  const deleteBlockRow = async (blockId: number) => {
    try {
      setActionError(null);
      await deleteAvailabilityBlock(blockId);
      if (providerId && form.siteId) {
        await refreshBlocks(form.siteId);
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not delete block."));
    }
  };

  const activateBlockRow = async (blockId: number) => {
    try {
      setActionError(null);
      await activateAvailabilityBlock(blockId);
      if (form.siteId) {
        await refreshBlocks(form.siteId);
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not activate block."));
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
    setActionError(null);
    setNewServiceId("");
    setShowServiceModal(true);
  };

  const closeServiceModal = () => setShowServiceModal(false);

  const addProviderServiceFromModal = async (values: { serviceId: string }) => {
    if (!providerId) return;
    const serviceId = Number(values.serviceId);
    if (!serviceId) return;
    const duplicate = providerServices.some((ps) => ps.serviceId === serviceId && ps.status !== "Inactive");
    if (duplicate) {
      setActionError("This service is already mapped to your profile.");
      return;
    }
    try {
      setActionError(null);
      await assignServiceToProvider({ providerId, serviceId });
      const svcMap = await fetchServicesByProvider(providerId);
      setProviderServices(svcMap as ProviderServiceMappingDto[]);
      setShowServiceModal(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not add provider service."));
    }
  };

  const removeProviderServiceRow = async (psid: number) => {
    try {
      setActionError(null);
      await removeServiceFromProvider(psid);
      if (providerId) {
        const svcMap = await fetchServicesByProvider(providerId);
        setProviderServices(svcMap as ProviderServiceMappingDto[]);
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not remove provider service."));
    }
  };

  const closeEditTemplateModal = () => setEditingTemplateId(null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Availability Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your working hours and availability templates</p>
        {actionError && <p className="text-sm text-destructive mt-2">{actionError}</p>}
        {actionNotice && <p className="text-sm text-primary mt-2">{actionNotice}</p>}
      </div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab("templates")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "templates" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Templates</button>
        <button onClick={() => setActiveTab("blocks")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "blocks" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Blocks</button>
        <button onClick={() => setActiveTab("slots")} className={`px-3 py-1.5 rounded-lg border text-sm ${activeTab === "slots" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>My Slots</button>
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
            <p className="text-xs text-muted-foreground mb-3">
              Slots that overlap an active block are automatically closed by backend.
            </p>
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
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {b.date} {b.startTime}-{b.endTime} ({b.reason || "Provider block"})
                    </p>
                    <p className="text-xs mt-0.5 text-foreground">Status: {b.status}</p>
                  </div>
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
                    {b.status !== "Active" && (
                      <button
                        onClick={() => void activateBlockRow(b.blockId)}
                        className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {activeTab === "slots" && <div className="mt-5 border-t border-border pt-4">
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="max-w-xs">
                <label className="block text-xs text-muted-foreground mb-1">Site</label>
                <select
                  value={form.siteId}
                  onChange={(e) => setForm((prev) => ({ ...prev, siteId: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded border border-border bg-input-background text-sm"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="px-3 py-2 rounded border border-border bg-input-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <select
                  value={slotStatusFilter}
                  onChange={(e) => setSlotStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded border border-border bg-input-background text-sm"
                >
                  <option>All</option>
                  <option>Open</option>
                  <option>Booked</option>
                  <option>CheckedIn</option>
                  <option>Completed</option>
                  <option>NoShow</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Site</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSlots && (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-sm text-muted-foreground text-center">
                        Loading slots...
                      </td>
                    </tr>
                  )}
                  {!loadingSlots && filteredSlotRows.map((slot) => (
                    <tr key={slot.key} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-3 text-sm text-foreground">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-muted-foreground">
                        {serviceNameById.get(slot.serviceId) ?? `Service ${slot.serviceId}`}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-muted-foreground">
                        {siteNameById.get(slot.siteId) ?? `Site ${slot.siteId}`}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-foreground">{slot.status}</td>
                      <td className="py-2.5 px-3 text-sm text-muted-foreground">
                        {slot.source}
                      </td>
                    </tr>
                  ))}
                  {!loadingSlots && filteredSlotRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-sm text-muted-foreground text-center">
                        No slots found for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>}
          {activeTab === "services" && <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-foreground">Provider Services</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active services are used while generating slots.
                </p>
              </div>
              <button
                onClick={openServiceModal}
                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground"
              >
                Add Service to Me
              </button>
            </div>
            <div className="space-y-2">
              {providerServices.map((ps) => (
                <div key={ps.psid} className="flex items-center justify-between p-3 rounded border border-border hover:bg-secondary/20">
                  <div>
                    <p className="text-sm text-foreground">{ps.serviceName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Service ID: {ps.serviceId}</p>
                    <p className="text-xs text-muted-foreground">Status: {ps.status}</p>
                  </div>
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
            <form className="space-y-4" onSubmit={handleTemplateCreateSubmit(handleCreate)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Day of Week</label>
                <select
                  defaultValue={form.dayOfWeek}
                  {...registerTemplateCreate("dayOfWeek", { valueAsNumber: true })}
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
                  defaultValue={form.siteId}
                  {...registerTemplateCreate("siteId", { valueAsNumber: true, min: { value: 1, message: "Select a valid site." } })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
                {templateCreateErrors.siteId && <p className="text-xs text-destructive mt-1">{templateCreateErrors.siteId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input
                    type="time"
                    defaultValue={form.startTime}
                    {...registerTemplateCreate("startTime", { required: "Start time required." })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input
                    type="time"
                    defaultValue={form.endTime}
                    {...registerTemplateCreate("endTime", { required: "End time required." })}
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
                  defaultValue={form.slotDurationMin}
                  {...registerTemplateCreate("slotDurationMin", { valueAsNumber: true, min: { value: 5, message: "Duration must be at least 5." } })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {templateCreateErrors.slotDurationMin && <p className="text-xs text-destructive mt-1">{templateCreateErrors.slotDurationMin.message}</p>}
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button onClick={closeCreateTemplateModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={() => void handleTemplateCreateSubmit(handleCreate)()}
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
            <form onSubmit={handleTemplateEditSubmit((values) => handleEdit(editingTemplateId, values))}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                <input type="time" defaultValue={editStartTime} {...registerTemplateEdit("startTime", { required: "Start time required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                <input type="time" defaultValue={editEndTime} {...registerTemplateEdit("endTime", { required: "End time required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-foreground mb-1.5">Slot Duration (minutes)</label>
              <input type="number" defaultValue={editDuration} {...registerTemplateEdit("slotDurationMin", { valueAsNumber: true, min: { value: 5, message: "Duration must be at least 5." } })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            </div>
            {templateEditErrors.slotDurationMin && <p className="text-xs text-destructive mt-1">{templateEditErrors.slotDurationMin.message}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={closeEditTemplateModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">Save</button>
            </div>
            </form>
          </div>
        </div>
      )}
      {showBlockModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">
              {blockModalMode === "create" ? "Add Block" : blockModalMode === "edit" ? "Edit Block" : "View Block"}
            </h3>
            <form className="space-y-3" onSubmit={handleBlockSubmit(addBlockFromModal)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                <input type="date" min={new Date().toISOString().slice(0, 10)} disabled={blockModalMode === "view"} defaultValue={blockDate} {...registerBlock("date", { required: "Date required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" disabled={blockModalMode === "view"} defaultValue={blockStartTime} {...registerBlock("startTime", { required: "Start time required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input type="time" disabled={blockModalMode === "view"} defaultValue={blockEndTime} {...registerBlock("endTime", { required: "End time required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <input
                  type="text"
                  disabled={blockModalMode === "view"}
                  defaultValue={blockReason}
                  {...registerBlock("reason")}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm disabled:opacity-70"
                />
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button onClick={closeBlockModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
              {blockModalMode !== "view" && (
                <button
                  onClick={() => void handleBlockSubmit(addBlockFromModal)()}
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
            <form onSubmit={handleProviderServiceSubmit(addProviderServiceFromModal)}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Service</label>
              <select
                {...registerProviderService("serviceId", { required: "Service is required." })}
                defaultValue={newServiceId}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="">Select service</option>
                {allServices.map((service) => (
                  <option key={service.serviceId} value={service.serviceId}>
                    {service.name}
                  </option>
                ))}
              </select>
              {providerServiceErrors.serviceId && <p className="text-xs text-destructive mt-1">{providerServiceErrors.serviceId.message}</p>}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeServiceModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancel</button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
