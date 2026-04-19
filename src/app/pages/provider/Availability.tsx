import { useState } from "react";
import { Plus, Clock } from "lucide-react";

const templates = [
  { id: 1, day: "Monday", site: "Apollo Clinic - Bangalore", startTime: "09:00", endTime: "17:00", slotDuration: 15 },
  { id: 2, day: "Tuesday", site: "Apollo Clinic - Bangalore", startTime: "09:00", endTime: "17:00", slotDuration: 15 },
  { id: 3, day: "Wednesday", site: "Apollo Clinic - Mumbai", startTime: "10:00", endTime: "16:00", slotDuration: 20 },
];

export default function ProviderAvailability() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Availability Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your working hours and availability templates</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Weekly Templates</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            {templates.map((template) => (
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
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Add Availability Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Day of Week</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Apollo Clinic - Bangalore</option>
                  <option>Apollo Clinic - Mumbai</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input type="time" className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
