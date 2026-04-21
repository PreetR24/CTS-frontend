import { Settings, Save } from "lucide-react";
import { useEffect, useState } from "react";
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
  type CapacityRuleDto,
  type SlaDto,
  createCapacityRule,
  createSla,
  deleteCapacityRule,
  deleteSla,
  searchCapacityRules,
  searchSlas,
  updateCapacityRule,
  updateSla,
} from "../../../api/adminGovernanceApi";

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

export default function AdminConfig() {
  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [capacityRules, setCapacityRules] = useState<CapacityRuleDto[]>([]);
  const [slas, setSlas] = useState<SlaDto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");
  const [activeSection, setActiveSection] = useState<"system" | "capacity" | "sla">("system");

  const [editingCapacityId, setEditingCapacityId] = useState<number | null>(null);
  const [capacityForm, setCapacityForm] = useState({
    scope: "Global",
    scopeId: "",
    maxApptsPerDay: "",
    maxConcurrentRooms: "",
    bufferMin: "10",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  });

  const [editingSlaId, setEditingSlaId] = useState<number | null>(null);
  const [slaForm, setSlaForm] = useState({
    scope: "Appointment",
    metric: "WaitTime",
    targetValue: "15",
    unit: "Minutes",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await searchSystemConfigs({ page: 1, pageSize: 200 });
        const [rules, slaList] = await Promise.all([
          searchCapacityRules(),
          searchSlas(),
        ]);
        if (!cancelled) {
          setConfigs(list);
          setDraft(Object.fromEntries(list.map((x) => [x.configId, x.value])));
          setCapacityRules(rules);
          setSlas(slaList);
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
    } catch {
      setNotice("Could not save system configuration.");
    }
  };

  const addConfig = async () => {
    if (!newConfigKey.trim()) {
      setNotice("Config key is required.");
      return;
    }
    const me = await meApi();
    const created = await createSystemConfig({
      key: newConfigKey.trim(),
      value: newConfigValue,
      scope: "Global",
      updatedBy: me.userId,
    });
    setConfigs((prev) => [created, ...prev]);
    setDraft((prev) => ({ ...prev, [created.configId]: created.value }));
    setNewConfigKey("");
    setNewConfigValue("");
    setNotice("Config created.");
  };

  const refreshConfigValue = async (configId: number) => {
    const loaded = await getSystemConfigById(configId);
    setDraft((prev) => ({ ...prev, [configId]: loaded.value }));
  };

  const removeConfig = async (configId: number) => {
    await deleteSystemConfig(configId);
    setConfigs((prev) => prev.filter((c) => c.configId !== configId));
  };

  const removeCapacityRule = async (ruleId: number) => {
    await deleteCapacityRule(ruleId);
    setCapacityRules((prev) => prev.filter((x) => x.ruleId !== ruleId));
  };

  const saveCapacityRule = async () => {
    if (!capacityForm.scope.trim() || !capacityForm.bufferMin.trim() || !capacityForm.effectiveFrom.trim()) {
      setNotice("Capacity rule requires scope, buffer, and effective from.");
      return;
    }
    if (Number.isNaN(Number(capacityForm.bufferMin)) || Number(capacityForm.bufferMin) < 0) {
      setNotice("Buffer must be a non-negative number.");
      return;
    }
    if (capacityForm.effectiveTo && capacityForm.effectiveTo < capacityForm.effectiveFrom) {
      setNotice("Effective To cannot be earlier than Effective From.");
      return;
    }
    const payload = {
      scope: capacityForm.scope.trim(),
      scopeId: capacityForm.scopeId.trim() ? Number(capacityForm.scopeId) : undefined,
      maxApptsPerDay: capacityForm.maxApptsPerDay.trim() ? Number(capacityForm.maxApptsPerDay) : undefined,
      maxConcurrentRooms: capacityForm.maxConcurrentRooms.trim() ? Number(capacityForm.maxConcurrentRooms) : undefined,
      bufferMin: Number(capacityForm.bufferMin),
      effectiveFrom: capacityForm.effectiveFrom,
      effectiveTo: capacityForm.effectiveTo.trim() || undefined,
    };
    if (editingCapacityId == null) {
      await createCapacityRule(payload);
      setNotice("Capacity rule created.");
    } else {
      await updateCapacityRule(editingCapacityId, payload);
      setNotice("Capacity rule updated.");
    }
    const rules = await searchCapacityRules();
    setCapacityRules(rules);
    setEditingCapacityId(null);
    setCapacityForm({
      scope: "Global",
      scopeId: "",
      maxApptsPerDay: "",
      maxConcurrentRooms: "",
      bufferMin: "10",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: "",
    });
  };

  const removeSla = async (slaId: number) => {
    await deleteSla(slaId);
    setSlas((prev) => prev.filter((x) => x.slaId !== slaId));
    setNotice("SLA deleted.");
  };

  const saveSla = async () => {
    if (!slaForm.scope.trim() || !slaForm.metric.trim() || !slaForm.targetValue.trim() || !slaForm.unit.trim()) {
      setNotice("SLA requires scope, metric, target value, and unit.");
      return;
    }
    const payload = {
      scope: slaForm.scope.trim(),
      metric: slaForm.metric.trim(),
      targetValue: Number(slaForm.targetValue),
      unit: slaForm.unit.trim(),
    };
    if (Number.isNaN(payload.targetValue) || payload.targetValue < 0) {
      setNotice("SLA target value must be a non-negative number.");
      return;
    }
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
    setSlaForm({
      scope: "Appointment",
      metric: "WaitTime",
      targetValue: "15",
      unit: "Minutes",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage system configs, capacity rules, SLA rules, and audit quick view</p>
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
              <button onClick={addConfig} className="px-3 py-2 border border-border rounded-lg text-sm">
                Add Config
              </button>
            </div>
          </div>
          <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Config key"
              value={newConfigKey}
              onChange={(e) => setNewConfigKey(e.target.value)}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            <input
              type="text"
              placeholder="Config value"
              value={newConfigValue}
              onChange={(e) => setNewConfigValue(e.target.value)}
              className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
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
              setCapacityForm({
                scope: "Global",
                scopeId: "",
                maxApptsPerDay: "",
                maxConcurrentRooms: "",
                bufferMin: "10",
                effectiveFrom: new Date().toISOString().slice(0, 10),
                effectiveTo: "",
              });
            }}>
              New Rule
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input value={capacityForm.scope} onChange={(e) => setCapacityForm((p) => ({ ...p, scope: e.target.value }))} placeholder="Scope" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input value={capacityForm.scopeId} onChange={(e) => setCapacityForm((p) => ({ ...p, scopeId: e.target.value }))} placeholder="Scope ID (optional)" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="number" value={capacityForm.maxApptsPerDay} onChange={(e) => setCapacityForm((p) => ({ ...p, maxApptsPerDay: e.target.value }))} placeholder="Max appts/day" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="number" value={capacityForm.maxConcurrentRooms} onChange={(e) => setCapacityForm((p) => ({ ...p, maxConcurrentRooms: e.target.value }))} placeholder="Max concurrent rooms" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="number" value={capacityForm.bufferMin} onChange={(e) => setCapacityForm((p) => ({ ...p, bufferMin: e.target.value }))} placeholder="Buffer (min)" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="date" value={capacityForm.effectiveFrom} onChange={(e) => setCapacityForm((p) => ({ ...p, effectiveFrom: e.target.value }))} className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="date" value={capacityForm.effectiveTo} onChange={(e) => setCapacityForm((p) => ({ ...p, effectiveTo: e.target.value }))} className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <button onClick={() => void saveCapacityRule()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
              {editingCapacityId == null ? "Create" : "Update"}
            </button>
          </div>
          <div className="space-y-2">
            {capacityRules.map((r) => (
              <div key={r.ruleId} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  #{r.ruleId} - {r.scope} - buffer {r.bufferMin}m - from {r.effectiveFrom}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => {
                      setEditingCapacityId(r.ruleId);
                      setCapacityForm({
                        scope: r.scope,
                        scopeId: r.scopeId?.toString() ?? "",
                        maxApptsPerDay: r.maxApptsPerDay?.toString() ?? "",
                        maxConcurrentRooms: r.maxConcurrentRooms?.toString() ?? "",
                        bufferMin: String(r.bufferMin),
                        effectiveFrom: r.effectiveFrom,
                        effectiveTo: r.effectiveTo ?? "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-xs border border-border rounded text-destructive"
                    onClick={() => void removeCapacityRule(r.ruleId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {capacityRules.length === 0 && <p className="text-sm text-muted-foreground">No capacity rules found.</p>}
          </div>
        </div>
      )}

      {activeSection === "sla" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">SLA Rules</p>
            <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => {
              setEditingSlaId(null);
              setSlaForm({
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
            <input value={slaForm.scope} onChange={(e) => setSlaForm((p) => ({ ...p, scope: e.target.value }))} placeholder="Scope" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input value={slaForm.metric} onChange={(e) => setSlaForm((p) => ({ ...p, metric: e.target.value }))} placeholder="Metric" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input type="number" value={slaForm.targetValue} onChange={(e) => setSlaForm((p) => ({ ...p, targetValue: e.target.value }))} placeholder="Target value" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <input value={slaForm.unit} onChange={(e) => setSlaForm((p) => ({ ...p, unit: e.target.value }))} placeholder="Unit" className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <button onClick={() => void saveSla()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
              {editingSlaId == null ? "Create" : "Update"}
            </button>
          </div>
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
                      setSlaForm({
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
