import { Settings, Save } from "lucide-react";

const configs = [
  { key: "booking.capacity.default.maxPerProviderPerDay", value: "20", description: "Maximum appointments per provider per day" },
  { key: "reminder.default.offset.min", value: "1440", description: "Default reminder offset in minutes (24 hours)" },
  { key: "slot.default.duration.min", value: "15", description: "Default slot duration in minutes" },
  { key: "slot.buffer.before.min", value: "5", description: "Default buffer before appointment" },
  { key: "slot.buffer.after.min", value: "5", description: "Default buffer after appointment" },
  { key: "booking.advance.min.days", value: "0", description: "Minimum days in advance for booking" },
  { key: "booking.advance.max.days", value: "90", description: "Maximum days in advance for booking" },
];

export default function AdminConfig() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage global system parameters and settings</p>
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
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.key} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">{config.key}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <input
                    type="text"
                    defaultValue={config.value}
                    className="w-24 px-3 py-1.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
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
      </div>
    </div>
  );
}
