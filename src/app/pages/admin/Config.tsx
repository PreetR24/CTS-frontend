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
  createCapacityRule,
  createSla,
  deleteCapacityRule,
  deleteSla,
  getAuditLogById,
  getCapacityRuleById,
  getSlaById,
  searchAuditLogs,
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
  const [capacityRules, setCapacityRules] = useState<Array<{ ruleId: number; scope: string; bufferMin: number }>>([]);
  const [slas, setSlas] = useState<Array<{ slaId: number; metric: string; targetValue: number; unit: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ auditId: number; action: string; resource: string }>>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await searchSystemConfigs({ page: 1, pageSize: 200 });
        const [rules, slaList, audits] = await Promise.all([
          searchCapacityRules(),
          searchSlas(),
          searchAuditLogs({ page: 1, pageSize: 50 }),
        ]);
        if (!cancelled) {
          setConfigs(list);
          setDraft(Object.fromEntries(list.map((x) => [x.configId, x.value])));
          setCapacityRules(rules.map((r) => ({ ruleId: r.ruleId, scope: r.scope, bufferMin: r.bufferMin })));
          setSlas(slaList.map((s) => ({ slaId: s.slaId, metric: s.metric, targetValue: s.targetValue, unit: s.unit })));
          setAuditLogs(audits.map((a) => ({ auditId: a.auditId, action: a.action, resource: a.resource })));
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
    } catch {
      // preserve current form for retry
    }
  };

  const addConfig = async () => {
    if (!newConfigKey.trim()) return;
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
  };

  const refreshConfigValue = async (configId: number) => {
    const loaded = await getSystemConfigById(configId);
    setDraft((prev) => ({ ...prev, [configId]: loaded.value }));
  };

  const removeConfig = async (configId: number) => {
    await deleteSystemConfig(configId);
    setConfigs((prev) => prev.filter((c) => c.configId !== configId));
  };

  const increaseCapacityRuleBuffer = async (ruleId: number) => {
    const detail = await getCapacityRuleById(ruleId);
    await updateCapacityRule(ruleId, { bufferMin: (detail.bufferMin ?? 0) + 5 });
    const rules = await searchCapacityRules();
    setCapacityRules(rules.map((x) => ({ ruleId: x.ruleId, scope: x.scope, bufferMin: x.bufferMin })));
  };

  const removeCapacityRule = async (ruleId: number) => {
    await deleteCapacityRule(ruleId);
    setCapacityRules((prev) => prev.filter((x) => x.ruleId !== ruleId));
  };

  const addCapacityRule = async () => {
    await createCapacityRule({
      scope: "Global",
      bufferMin: 10,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    const rules = await searchCapacityRules();
    setCapacityRules(rules.map((x) => ({ ruleId: x.ruleId, scope: x.scope, bufferMin: x.bufferMin })));
  };

  const increaseSlaTarget = async (slaId: number) => {
    const detail = await getSlaById(slaId);
    await updateSla(slaId, { targetValue: detail.targetValue + 1 });
    const list = await searchSlas();
    setSlas(list.map((x) => ({ slaId: x.slaId, metric: x.metric, targetValue: x.targetValue, unit: x.unit })));
  };

  const removeSla = async (slaId: number) => {
    await deleteSla(slaId);
    setSlas((prev) => prev.filter((x) => x.slaId !== slaId));
  };

  const addSlaRule = async () => {
    await createSla({ scope: "Appointment", metric: "WaitTime", targetValue: 15, unit: "Minutes" });
    const list = await searchSlas();
    setSlas(list.map((x) => ({ slaId: x.slaId, metric: x.metric, targetValue: x.targetValue, unit: x.unit })));
  };

  const showAuditLogDetail = async (auditId: number) => {
    const detail = await getAuditLogById(auditId);
    setNotice(`${detail.action} on ${detail.resource}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage global system parameters and settings</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Configuration Parameters</p>
              <p className="text-xs text-muted-foreground mt-0.5">These settings affect system-wide behavior</p>
            </div>
          </div>
          <button
            onClick={saveChanges}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button onClick={addConfig} className="ml-2 px-3 py-2 border border-border rounded-lg text-sm">
            Add Config
          </button>
        </div>
        <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
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

        <div className="p-5">
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.configId} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">{config.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {defaultDescriptions[config.key] ?? "System configuration parameter"}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={draft[config.configId] ?? config.value}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [config.configId]: e.target.value }))
                    }
                    className="w-24 px-3 py-1.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button onClick={() => void refreshConfigValue(config.configId)} className="px-2 py-1 text-xs border border-border rounded">
                    Refresh
                  </button>
                  <button
                    onClick={() => void removeConfig(config.configId)}
                    className="px-2 py-1 text-xs border border-border rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-[#e8c9a9]/10 border border-[#e8c9a9]/30">
            <p className="text-sm font-medium text-foreground mb-2">Important Notes</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Changes to capacity rules require restart of slot generation</li>
              <li>• Reminder offsets are calculated from appointment start time</li>
              <li>• Buffer times help prevent provider overload</li>
            </ul>
          </div>
        </div>
        <div className="p-5 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Capacity Rules</p>
          <div className="space-y-2 mb-3">
            {capacityRules.map((r) => (
              <div key={r.ruleId} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>#{r.ruleId}</span>
                <span>{r.scope}</span>
                <span>buffer {r.bufferMin}m</span>
                <button className="px-2 py-1 border border-border rounded" onClick={() => void increaseCapacityRuleBuffer(r.ruleId)}>
                  +5m
                </button>
                <button
                  className="px-2 py-1 border border-border rounded"
                  onClick={() => void removeCapacityRule(r.ruleId)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => void addCapacityRule()}>
            Add Capacity Rule
          </button>
        </div>
        <div className="p-5 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">SLA Rules</p>
          <div className="space-y-2 mb-3">
            {slas.map((s) => (
              <div key={s.slaId} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>#{s.slaId}</span>
                <span>{s.metric}</span>
                <span>{s.targetValue} {s.unit}</span>
                <button className="px-2 py-1 border border-border rounded" onClick={() => void increaseSlaTarget(s.slaId)}>
                  +1
                </button>
                <button
                  className="px-2 py-1 border border-border rounded"
                  onClick={() => void removeSla(s.slaId)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <button className="px-3 py-2 border border-border rounded-lg text-sm" onClick={() => void addSlaRule()}>
            Add SLA
          </button>
        </div>
        <div className="p-5 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Audit Logs</p>
          <div className="space-y-1">
            {auditLogs.map((a) => (
              <button key={a.auditId} className="block text-left text-xs text-muted-foreground hover:text-foreground" onClick={() => void showAuditLogDetail(a.auditId)}>
                #{a.auditId} {a.action} / {a.resource}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
