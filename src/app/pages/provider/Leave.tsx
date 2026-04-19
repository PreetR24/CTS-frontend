import { useState } from "react";
import { Plus } from "lucide-react";

const leaves = [
  { id: 1, type: "Vacation", startDate: "2026-04-05", endDate: "2026-04-10", status: "Pending", impactedAppts: 12 },
  { id: 2, type: "CME", startDate: "2026-05-15", endDate: "2026-05-17", status: "Approved", impactedAppts: 8 },
];

export default function ProviderLeave() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Leave Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your time-off requests</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">My Leave History</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Start Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">End Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Impacted Appointments</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{leave.type}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.startDate}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.endDate}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.impactedAppts} appointments</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                      leave.status === "Approved" ? "bg-[#a9d4b8]/30 text-foreground" :
                      leave.status === "Pending" ? "bg-[#e8c9a9]/30 text-foreground" :
                      "bg-[#eb9d9d]/30 text-foreground"
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Request Leave</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Leave Type</label>
                <select className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Vacation</option>
                  <option>Sick</option>
                  <option>CME/Conference</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Date</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
