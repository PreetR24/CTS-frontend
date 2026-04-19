import { useState } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";

const holidays = [
  { id: 1, date: "2026-01-26", name: "Republic Day", siteId: 1, site: "Apollo Clinic - Bangalore" },
  { id: 2, date: "2026-08-15", name: "Independence Day", siteId: 1, site: "All Sites" },
  { id: 3, date: "2026-10-02", name: "Gandhi Jayanti", siteId: 1, site: "All Sites" },
  { id: 4, date: "2026-11-14", name: "Diwali", siteId: 1, site: "All Sites" },
];

export default function AdminHolidays() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Holidays</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage site-specific non-working days</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Slot generation will skip these dates</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#e8c9a9]/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#e8c9a9]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{holiday.date}</p>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{holiday.site}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Add Holiday</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g., Diwali"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Apply To</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>All Sites</option>
                  <option>Apollo Clinic - Bangalore</option>
                  <option>Apollo Clinic - Mumbai</option>
                  <option>Apollo Clinic - Delhi</option>
                </select>
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
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
