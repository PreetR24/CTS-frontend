import { Settings, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { meApi } from "../../../api/authApi";
import {
  createSystemConfig,
  deleteSystemConfig,
  getSystemConfigById,
  searchSystemConfigs,
  updateSystemConfig,
  type SystemConfigDto,
} from "../../../api/systemConfigsApi";
import {
  type BlackoutDto,
  type CapacityRuleDto,
  type SlaDto,
  activateBlackout,
  cancelBlackout,
  createBlackout,
  createCapacityRule,
  createSla,
  deleteCapacityRule,
  deleteSla,
  searchBlackouts,
  searchCapacityRules,
  searchSlas,
  updateCapacityRule,
  updateSla,
} from "../../../api/adminGovernanceApi";
import { fetchSites, type SiteDto } from "../../../api/masterdataApi";

const defaultDescriptions: Record<string, string> = {
  "booking.capacity.default.maxPerProviderPerDay":
    "Maximum appointments per provider per day",
  "reminder.default.offset.min": "Default reminder offset in minutes (24 hours)",
  "slot.default.duration.min": "Default slot duration in minutes",
  "slot.buffer.before.min": "Default buffer before appointment",
  "slot.buffer.after.min": "Default buffer after appointment",
  "booking.advance.min.days": "Minimum days in advance for booking",
  "booking.advance.max.days": "Maximum days in advance for booking",
};

type ConfigCreateForm = {
  key: string;
  value: string;
};

type BlackoutFormValues = {
  siteId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

type CapacityFormValues = {
  scope: string;
  scopeId: string;
  maxApptsPerDay: string;
  maxConcurrentRooms: string;
  bufferMin: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
};

type SlaFormValues = {
  scope: string;
  metric: string;
  targetValue: string;
  unit: string;
};

export default function AdminConfig() {
  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [capacityRules, setCapacityRules] = useState<CapacityRuleDto[]>([]);
  const [slas, setSlas] = useState<SlaDto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"system" | "blackout" | "capacity" | "sla">("system");
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDto[]>([]);
  const [selectedBlackoutSiteId, setSelectedBlackoutSiteId] = useState<number | "">("");
  const [blackoutFromDate, setBlackoutFromDate] = useState("");
  const [blackoutToDate, setBlackoutToDate] = useState("");
  const [editingBlackoutId, setEditingBlackoutId] = useState<number | null>(null);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);

  const [editingCapacityId, setEditingCapacityId] = useState<number | null>(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacityScopeFilter, setCapacityScopeFilter] = useState("");
  const [capacityStatusFilter, setCapacityStatusFilter] = useState("All");
  const [editingSlaId, setEditingSlaId] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const { register: registerConfigCreate, handleSubmit: handleConfigCreateSubmit, reset: resetConfigCreate, formState: { errors: configCreateErrors } } =
    useForm<ConfigCreateForm>({ defaultValues: { key: "", value: "" } });
  const { register: registerBlackout, handleSubmit: handleBlackoutSubmit, reset: resetBlackout, setValue: setBlackoutValue, formState: { errors: blackoutErrors } } =
    useForm<BlackoutFormValues>({ defaultValues: { siteId: "", startDate: today, endDate: today, reason: "" } });
  const { register: registerCapacity, handleSubmit: handleCapacitySubmit, reset: resetCapacity, formState: { errors: capacityErrors } } =
    useForm<CapacityFormValues>({
      defaultValues: {
        scope: "Global",
        scopeId: "",
        maxApptsPerDay: "",
        maxConcurrentRooms: "",
        bufferMin: "10",
        effectiveFrom: today,
        effectiveTo: "",
        status: "Active",
      },
    });
  const { register: registerSla, handleSubmit: handleSlaSubmit, reset: resetSla, formState: { errors: slaErrors } } =
    useForm<SlaFormValues>({ defaultValues: { scope: "Appointment", metric: "WaitTime", targetValue: "15", unit: "Minutes" } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await searchSystemConfigs({ page: 1, pageSize: 200 });
        const [rules, slaList, siteList] = await Promise.all([
          searchCapacityRules(undefined, undefined),
          searchSlas(),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (!cancelled) {
          setConfigs(list);
          setDraft(Object.fromEntries(list.map((x) => [x.configId, x.value])));
          setCapacityRules(rules);
          setSlas(slaList);
          setSites(siteList);
          const firstActiveSite = siteList.find((s) => s.status === "Active") ?? siteList[0];
          if (firstActiveSite) {
            setSelectedBlackoutSiteId(firstActiveSite.siteId);
            setBlackoutValue("siteId", String(firstActiveSite.siteId));
            const loadedBlackouts = await searchBlackouts({ siteId: firstActiveSite.siteId });
            if (!cancelled) setBlackouts(loadedBlackouts);
          }
        }
      } catch {
        if (!cancelled) {
          setConfigs([]);
          setDraft({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changed = configs.filter((c) => (draft[c.configId] ?? c.value) !== c.value);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      const apiMessage = error.response?.data?.message;
      if (apiMessage) return apiMessage;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const saveChanges = async () => {
    try {
      const me = await meApi();
      const updated = await Promise.all(
        changed.map((item) =>
          updateSystemConfig(item.configId, {
            value: draft[item.configId],
            updatedBy: me.userId,
          })
        )
      );
      const byId = new Map(updated.map((u) => [u.configId, u]));
      setConfigs((prev) => prev.map((c) => byId.get(c.configId) ?? c));
      setNotice("System configuration saved.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not save system configuration."));
    }
  };

  const saveSingleConfig = async (configId: number) => {
    try {
      const me = await meApi();
      const updated = await updateSystemConfig(configId, {
        value: draft[configId],
        updatedBy: me.userId,
      });
      setConfigs((prev) => prev.map((c) => (c.configId === configId ? updated : c)));
      setNotice("Config updated.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not update config."));
    }
  };

  const addConfig = async (values: ConfigCreateForm) => {
    try {
      const me = await meApi();
      const created = await createSystemConfig({
        key: values.key.trim(),
        value: values.value,
        scope: "Global",
        updatedBy: me.userId,
      });
      setConfigs((prev) => [created, ...prev]);
      setDraft((prev) => ({ ...prev, [created.configId]: created.value }));
      resetConfigCreate({ key: "", value: "" });
      setNotice("Config created.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not create config."));
    }
  };

  const refreshConfigValue = async (configId: number) => {
    try {
      const loaded = await getSystemConfigById(configId);
      setDraft((prev) => ({ ...prev, [configId]: loaded.value }));
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not refresh config value."));
    }
  };

  const removeConfig = async (configId: number) => {
    try {
      await deleteSystemConfig(configId);
      setConfigs((prev) => prev.filter((c) => c.configId !== configId));
      setNotice("Config deleted.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not delete config."));
    }
  };

  const removeCapacityRule = async (ruleId: number) => {
    try {
      await deleteCapacityRule(ruleId);
      setCapacityRules((prev) =>
        prev.map((x) => (x.ruleId === ruleId ? { ...x, status: "Inactive" } : x))
      );
      setNotice("Capacity rule deactivated.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not deactivate capacity rule."));
    }
  };

  const activateCapacityRule = async (ruleId: number) => {
    try {
      const updated = await updateCapacityRule(ruleId, { status: "Active" });
      setCapacityRules((prev) => prev.map((x) => (x.ruleId === ruleId ? updated : x)));
      setNotice("Capacity rule activated.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not activate capacity rule."));
    }
  };

  const loadBlackouts = async (siteId: number, from?: string, to?: string) => {
    const list = await searchBlackouts({
      siteId,
      startDate: from?.trim() || undefined,
      endDate: to?.trim() || undefined,
    });
    setBlackouts(list);
  };

  const applyBlackoutFilters = async () => {
    if (selectedBlackoutSiteId === "") {
      setNotice("Select a site to search blackouts.");
      return;
    }
    await loadBlackouts(selectedBlackoutSiteId, blackoutFromDate, blackoutToDate);
  };

  const clearBlackoutFilters = async () => {
    if (selectedBlackoutSiteId === "") return;
    setBlackoutFromDate("");
    setBlackoutToDate("");
    await loadBlackouts(selectedBlackoutSiteId);
  };

  const resetBlackoutForm = () => {
    setEditingBlackoutId(null);
    resetBlackout({
      siteId: selectedBlackoutSiteId === "" ? "" : String(selectedBlackoutSiteId),
      startDate: today,
      endDate: today,
      reason: "",
    });
  };

  const saveBlackout = async (values: BlackoutFormValues) => {
    if (!values.siteId || !values.startDate || !values.endDate) {
      setNotice("Site, start date, and end date are required for blackout.");
      return;
    }
    if (values.endDate < values.startDate) {
      setNotice("Blackout end date cannot be earlier than start date.");
      return;
    }
    const payload = {
      siteId: Number(values.siteId),
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason.trim() || undefined,
    };
    try {
      if (editingBlackoutId == null) {
        await createBlackout(payload);
        setNotice("Blackout created.");
      } else {
        await cancelBlackout(editingBlackoutId);
        await createBlackout(payload);
        setNotice("Blackout updated.");
      }
      const targetSiteId = Number(values.siteId);
      if (selectedBlackoutSiteId !== targetSiteId) {
        setSelectedBlackoutSiteId(targetSiteId);
      }
      await loadBlackouts(targetSiteId, blackoutFromDate, blackoutToDate);
      resetBlackoutForm();
      setShowBlackoutModal(false);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not save blackout."));
    }
  };

  const deactivateBlackout = async (blackoutId: number) => {
    try {
      await cancelBlackout(blackoutId);
      setBlackouts((prev) =>
        prev.map((b) => (b.blackoutId === blackoutId ? { ...b, status: "Inactive" } : b))
      );
      setNotice("Blackout deactivated.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not deactivate blackout."));
    }
  };

  const activateBlackoutRow = async (blackoutId: number) => {
    try {
      await activateBlackout(blackoutId);
      if (selectedBlackoutSiteId !== "") {
        await loadBlackouts(selectedBlackoutSiteId, blackoutFromDate, blackoutToDate);
      }
      setNotice("Blackout activated.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not activate blackout."));
    }
  };

  const loadCapacityRules = async (scope?: string, status?: string) => {
    const rules = await searchCapacityRules(
      scope?.trim() ? scope.trim() : undefined,
      status && status !== "All" ? status : undefined
    );
    setCapacityRules(rules);
  };

  const applyCapacityFilters = async () => {
    try {
      await loadCapacityRules(capacityScopeFilter, capacityStatusFilter);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not search capacity rules."));
    }
  };

  const clearCapacityFilters = async () => {
    setCapacityScopeFilter("");
    setCapacityStatusFilter("All");
    try {
      await loadCapacityRules(undefined, undefined);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not reload capacity rules."));
    }
  };

  const saveCapacityRule = async (values: CapacityFormValues) => {
    if (!values.scope.trim() || !values.bufferMin.trim() || !values.effectiveFrom.trim()) {
      setNotice("Capacity rule requires scope, buffer, and effective from.");
      return;
    }
    if (Number.isNaN(Number(values.bufferMin)) || Number(values.bufferMin) < 0) {
      setNotice("Buffer must be a non-negative number.");
      return;
    }
    if (values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      setNotice("Effective To cannot be earlier than Effective From.");
      return;
    }
    const payload = {
      scope: values.scope.trim(),
      scopeId: values.scopeId.trim() ? Number(values.scopeId) : undefined,
      maxApptsPerDay: values.maxApptsPerDay.trim() ? Number(values.maxApptsPerDay) : undefined,
      maxConcurrentRooms: values.maxConcurrentRooms.trim() ? Number(values.maxConcurrentRooms) : undefined,
      bufferMin: Number(values.bufferMin),
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo.trim() || undefined,
    };
    try {
      if (editingCapacityId == null) {
        await createCapacityRule(payload);
        setNotice("Capacity rule created.");
      } else {
        await updateCapacityRule(editingCapacityId, { ...payload, status: values.status });
        setNotice("Capacity rule updated.");
      }
      const rules = await searchCapacityRules(
        capacityScopeFilter.trim() || undefined,
        capacityStatusFilter !== "All" ? capacityStatusFilter : undefined
      );
      setCapacityRules(rules);
      setEditingCapacityId(null);
      resetCapacity({
        scope: "Global",
        scopeId: "",
        maxApptsPerDay: "",
        maxConcurrentRooms: "",
        bufferMin: "10",
        effectiveFrom: today,
        effectiveTo: "",
        status: "Active",
      });
      setShowCapacityModal(false);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not save capacity rule."));
    }
  };

  const removeSla = async (slaId: number) => {
    try {
      await deleteSla(slaId);
      setSlas((prev) => prev.filter((x) => x.slaId !== slaId));
      setNotice("SLA deleted.");
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not delete SLA."));
    }
  };

  const saveSla = async (values: SlaFormValues) => {
    if (!values.scope.trim() || !values.metric.trim() || !values.targetValue.trim() || !values.unit.trim()) {
      setNotice("SLA requires scope, metric, target value, and unit.");
      return;
    }
    const payload = {
      scope: values.scope.trim(),
      metric: values.metric.trim(),
      targetValue: Number(values.targetValue),
      unit: values.unit.trim(),
    };
    if (Number.isNaN(payload.targetValue) || payload.targetValue < 0) {
      setNotice("SLA target value must be a non-negative number.");
      return;
    }
    try {
      if (editingSlaId == null) {
        await createSla(payload);
        setNotice("SLA created.");
      } else {
        await updateSla(editingSlaId, payload);
        setNotice("SLA updated.");
      }
      const list = await searchSlas();
      setSlas(list);
      setEditingSlaId(null);
      resetSla({
        scope: "Appointment",
        metric: "WaitTime",
        targetValue: "15",
        unit: "Minutes",
      });
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not save SLA."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage system configs, capacity rules, SLA rules, and blackouts</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border mb-4">
        <div className="p-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection("system")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${activeSection === "system" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            System Configs
          </button>
          <button
            onClick={() => setActiveSection("blackout")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${activeSection === "blackout" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            Blackouts
          </button>
          <button
            onClick={() => setActiveSection("capacity")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${activeSection === "capacity" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            Capacity Rules
          </button>
          <button
            onClick={() => setActiveSection("sla")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${activeSection === "sla" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            SLA Rules
          </button>
        </div>
      </div>

      {activeSection === "system" && (
        <div className="bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Configuration Parameters</p>
                <p className="text-xs text-muted-foreground mt-0.5">{changed.length} unsaved change(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveChanges}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button onClick={() => void handleConfigCreateSubmit(addConfig)()} className="px-3 py-2 border border-border rounded-lg text-sm">
                Add Config
              </button>
            </div>
          </div>
          <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Config Key</label>
            <label className="text-xs text-muted-foreground">Config Value</label>
            <input
              type="text"
              placeholder="Config key"
              {...registerConfigCreate("key", {
                required: "Config key is required.",
                validate: (value) => value.trim().length > 0 || "Config key cannot be empty.",
              })}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            <input
              type="text"
              placeholder="Config value"
              {...registerConfigCreate("value")}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            {configCreateErrors.key && <p className="text-xs text-destructive">{configCreateErrors.key.message}</p>}
          </div>
          <div className="p-5 space-y-4">
            {configs.map((config) => (
              <div key={config.configId} className="p-4 rounded-lg border border-border">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto_auto] gap-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">{config.key}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {defaultDescriptions[config.key] ?? "System configuration parameter"}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={draft[config.configId] ?? config.value}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [config.configId]: e.target.value }))
                    }
                    className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button onClick={() => void refreshConfigValue(config.configId)} className="px-2 py-1 text-xs border border-border rounded">
                    Refresh
                  </button>
                  <button
                    onClick={() => void saveSingleConfig(config.configId)}
                    className="px-2 py-1 text-xs border border-border rounded"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => void removeConfig(config.configId)}
                    className="px-2 py-1 text-xs border border-border rounded text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {configs.length === 0 && <p className="text-sm text-muted-foreground">No system configs found.</p>}
          </div>
        </div>
      )}

      {activeSection === "capacity" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Capacity Rules</p>
            <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => {
              setEditingCapacityId(null);
              resetCapacity({
                scope: "Global",
                scopeId: "",
                maxApptsPerDay: "",
                maxConcurrentRooms: "",
                bufferMin: "10",
                effectiveFrom: today,
                effectiveTo: "",
                status: "Active",
              });
              setShowCapacityModal(true);
            }}>
              New Rule
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Scope Filter</label>
              <input value={capacityScopeFilter} onChange={(e) => setCapacityScopeFilter(e.target.value)} placeholder="Global / Site / Provider" className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status Filter</label>
              <select value={capacityStatusFilter} onChange={(e) => setCapacityStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <button onClick={() => void applyCapacityFilters()} className="px-3 py-2 rounded-lg border border-border text-sm">Search</button>
              <button onClick={() => void clearCapacityFilters()} className="px-3 py-2 rounded-lg border border-border text-sm">Clear</button>
            </div>
          </div>
          <div className="space-y-2">
            {capacityRules.map((r) => (
              <div key={r.ruleId} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  #{r.ruleId} - {r.scope} - buffer {r.bufferMin}m - from {r.effectiveFrom} - {r.status}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => {
                      setEditingCapacityId(r.ruleId);
                      resetCapacity({
                        scope: r.scope,
                        scopeId: r.scopeId?.toString() ?? "",
                        maxApptsPerDay: r.maxApptsPerDay?.toString() ?? "",
                        maxConcurrentRooms: r.maxConcurrentRooms?.toString() ?? "",
                        bufferMin: String(r.bufferMin),
                        effectiveFrom: r.effectiveFrom,
                        effectiveTo: r.effectiveTo ?? "",
                        status: r.status || "Active",
                      });
                      setShowCapacityModal(true);
                    }}
                  >
                    Edit
                  </button>
                  {r.status === "Active" ? (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded text-destructive"
                      onClick={() => void removeCapacityRule(r.ruleId)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded"
                      onClick={() => void activateCapacityRule(r.ruleId)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
            {capacityRules.length === 0 && <p className="text-sm text-muted-foreground">No capacity rules found.</p>}
          </div>
        </div>
      )}

      {showCapacityModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-3xl">
            <h3 className="text-base font-medium text-foreground mb-4">
              {editingCapacityId == null ? "Create Capacity Rule" : "Edit Capacity Rule"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <label className="text-xs text-muted-foreground">Scope</label>
              <label className="text-xs text-muted-foreground">Scope ID</label>
              <label className="text-xs text-muted-foreground">Max Appointments / Day</label>
              <label className="text-xs text-muted-foreground">Max Concurrent Rooms</label>
              <input {...registerCapacity("scope", { required: "Scope is required." })} placeholder="Scope (Global/Site/Provider)" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <input {...registerCapacity("scopeId")} placeholder="Scope ID (optional)" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <input type="number" {...registerCapacity("maxApptsPerDay", { min: { value: 0, message: "Cannot be negative." } })} placeholder="Max appointments per day" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <input type="number" {...registerCapacity("maxConcurrentRooms", { min: { value: 0, message: "Cannot be negative." } })} placeholder="Max concurrent rooms" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <label className="text-xs text-muted-foreground">Buffer Minutes</label>
              <label className="text-xs text-muted-foreground">Effective From</label>
              <label className="text-xs text-muted-foreground">Effective To</label>
              <label className="text-xs text-muted-foreground">Status</label>
              <input type="number" {...registerCapacity("bufferMin", { required: "Buffer is required.", min: { value: 0, message: "Cannot be negative." } })} placeholder="Buffer minutes" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <input type="date" {...registerCapacity("effectiveFrom", { required: "Effective from is required." })} placeholder="Effective from" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <input type="date" {...registerCapacity("effectiveTo")} placeholder="Effective to (optional)" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <select {...registerCapacity("status")} title="Capacity rule status" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {(capacityErrors.scope || capacityErrors.bufferMin || capacityErrors.maxApptsPerDay || capacityErrors.maxConcurrentRooms || capacityErrors.effectiveFrom) && (
              <p className="text-xs text-destructive mb-3">
                {capacityErrors.scope?.message || capacityErrors.bufferMin?.message || capacityErrors.maxApptsPerDay?.message || capacityErrors.maxConcurrentRooms?.message || capacityErrors.effectiveFrom?.message}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCapacityModal(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={() => void handleCapacitySubmit(saveCapacityRule)()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                {editingCapacityId == null ? "Create" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "blackout" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-medium text-foreground">Blackouts</p>
            <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => {
              resetBlackoutForm();
              setShowBlackoutModal(true);
            }}>
              New Blackout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Site</label>
              <select
                value={selectedBlackoutSiteId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : "";
                  setSelectedBlackoutSiteId(value);
                  if (value !== "") {
                    setBlackoutValue("siteId", String(value));
                    void loadBlackouts(value, blackoutFromDate, blackoutToDate);
                  } else {
                    setBlackouts([]);
                  }
                }}
                title="Site filter"
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">From Date</label>
              <input
                type="date"
                placeholder="From date"
                value={blackoutFromDate}
                onChange={(e) => setBlackoutFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">To Date</label>
              <input
                type="date"
                placeholder="To date"
                value={blackoutToDate}
                onChange={(e) => setBlackoutToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => void applyBlackoutFilters()} className="px-3 py-2 rounded-lg border border-border text-sm">
                Search
              </button>
              <button onClick={() => void clearBlackoutFilters()} className="px-3 py-2 rounded-lg border border-border text-sm">
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {blackouts.map((b) => (
              <div key={b.blackoutId} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  #{b.blackoutId} - Site {b.siteId} - {b.startDate} to {b.endDate} - {b.status}
                  {b.reason ? ` - ${b.reason}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => {
                      setEditingBlackoutId(b.blackoutId);
                      resetBlackout({
                        siteId: String(b.siteId),
                        startDate: b.startDate,
                        endDate: b.endDate,
                        reason: b.reason ?? "",
                      });
                      setShowBlackoutModal(true);
                    }}
                  >
                    Edit
                  </button>
                  {b.status === "Active" ? (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded text-destructive"
                      onClick={() => void deactivateBlackout(b.blackoutId)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded"
                      onClick={() => void activateBlackoutRow(b.blackoutId)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
            {blackouts.length === 0 && <p className="text-sm text-muted-foreground">No blackouts found for selected filters.</p>}
          </div>
        </div>
      )}

      {showBlackoutModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-2xl">
            <h3 className="text-base font-medium text-foreground mb-4">
              {editingBlackoutId == null ? "Create Blackout" : "Edit Blackout"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <label className="text-xs text-muted-foreground">Site</label>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <select
                {...registerBlackout("siteId", { required: "Site is required." })}
                title="Blackout site"
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              >
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Start date"
                {...registerBlackout("startDate", { required: "Start date is required." })}
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
              <label className="text-xs text-muted-foreground">End Date</label>
              <label className="text-xs text-muted-foreground">Reason</label>
              <input
                type="date"
                placeholder="End date"
                {...registerBlackout("endDate", { required: "End date is required." })}
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
              <input
                type="text"
                {...registerBlackout("reason")}
                placeholder="Reason (optional)"
                className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
              />
            </div>
            {(blackoutErrors.siteId || blackoutErrors.startDate || blackoutErrors.endDate) && (
              <p className="text-xs text-destructive mb-3">
                {blackoutErrors.siteId?.message || blackoutErrors.startDate?.message || blackoutErrors.endDate?.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBlackoutModal(false)} className="px-3 py-2 rounded-lg border border-border text-sm">
                Cancel
              </button>
              <button onClick={() => void handleBlackoutSubmit(saveBlackout)()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                {editingBlackoutId == null ? "Create" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "sla" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">SLA Rules</p>
            <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => {
              setEditingSlaId(null);
              resetSla({
                scope: "Appointment",
                metric: "WaitTime",
                targetValue: "15",
                unit: "Minutes",
              });
            }}>
              New SLA
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
            <label className="text-xs text-muted-foreground">Scope</label>
            <label className="text-xs text-muted-foreground">Metric</label>
            <label className="text-xs text-muted-foreground">Target Value</label>
            <label className="text-xs text-muted-foreground">Unit</label>
            <span />
            <input {...registerSla("scope", { required: "Scope is required." })} placeholder="Scope" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input {...registerSla("metric", { required: "Metric is required." })} placeholder="Metric" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="number" {...registerSla("targetValue", { required: "Target is required.", min: { value: 0, message: "Target cannot be negative." } })} placeholder="Target value" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input {...registerSla("unit", { required: "Unit is required." })} placeholder="Unit" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <button onClick={() => void handleSlaSubmit(saveSla)()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
              {editingSlaId == null ? "Create" : "Update"}
            </button>
          </div>
          {(slaErrors.scope || slaErrors.metric || slaErrors.targetValue || slaErrors.unit) && (
            <p className="text-xs text-destructive mb-3">
              {slaErrors.scope?.message || slaErrors.metric?.message || slaErrors.targetValue?.message || slaErrors.unit?.message}
            </p>
          )}
          <div className="space-y-2">
            {slas.map((s) => (
              <div key={s.slaId} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  #{s.slaId} - {s.metric} - {s.targetValue} {s.unit}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => {
                      setEditingSlaId(s.slaId);
                      resetSla({
                        scope: s.scope,
                        metric: s.metric,
                        targetValue: String(s.targetValue),
                        unit: s.unit,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-xs border border-border rounded text-destructive"
                    onClick={() => void removeSla(s.slaId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {slas.length === 0 && <p className="text-sm text-muted-foreground">No SLA rules found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
