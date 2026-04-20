import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { meApi } from "../../../api/authApi";
import {
  cancelLeave,
  getLeaveImpacts,
  getLeaveRequestById,
  searchLeaveRequests,
  submitLeaveRequest,
  type LeaveRequestDto,
} from "../../../api/operationsApi";
import { createLeaveImpact } from "../../../api/operationsPlanningApi";

type LeaveForm = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export default function ProviderLeave() {
  const [showModal, setShowModal] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequestDto[]>([]);
  const [impactCountByLeave, setImpactCountByLeave] = useState<Map<number, number>>(new Map());
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveForm>({
    leaveType: "Vacation",
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (cancelled) return;
        setMyUserId(me.userId);
        const list = await searchLeaveRequests({ userId: me.userId });
        if (cancelled) return;
        setLeaves(list);
        const impacts = await Promise.all(list.map((l) => getLeaveImpacts(l.leaveId).catch(() => [])));
        if (cancelled) return;
        setImpactCountByLeave(new Map(list.map((l, i) => [l.leaveId, impacts[i].length])));
      } catch {
        if (!cancelled) setLeaves([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const leaveRows = leaves.map((leave) => ({
    leaveId: leave.leaveId,
    userId: leave.userId,
    type: leave.leaveType,
    startDate: leave.startDate,
    endDate: leave.endDate,
    status: leave.status,
    impactedAppts: impactCountByLeave.get(leave.leaveId) ?? 0,
  }));

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.leaveType) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const created = await submitLeaveRequest({
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      try {
        await createLeaveImpact({
          leaveId: created.leaveId,
          impactType: "ProviderLeave",
          impactJson: JSON.stringify({
            leaveType: form.leaveType,
            startDate: form.startDate,
            endDate: form.endDate,
            reason: form.reason || null,
          }),
        });
      } catch {
        // Keep leave submission successful even if impact creation fails.
      }
      setLeaves((prev) => [created, ...prev]);
      setShowModal(false);
      setSubmitMessage("Leave request submitted.");
      setForm({
        leaveType: "Vacation",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (leaveId: number) => {
    try {
      const updated = await cancelLeave(leaveId);
      setLeaves((prev) => prev.map((l) => (l.leaveId === leaveId ? updated : l)));
    } catch {
      // leave existing row unchanged on backend rejection
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Leave Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your time-off requests</p>
        {detailMessage && <p className="text-sm text-primary mt-2">{detailMessage}</p>}
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
              {leaveRows.map((leave) => (
                <tr key={leave.leaveId} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{leave.type}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.startDate}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.endDate}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{leave.impactedAppts} appointments</td>
                  <td className="py-4 px-4 flex items-center gap-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                      leave.status === "Approved" ? "bg-[#a9d4b8]/30 text-foreground" :
                      leave.status === "Pending" ? "bg-[#e8c9a9]/30 text-foreground" :
                      "bg-[#eb9d9d]/30 text-foreground"
                    }`}>
                      {leave.status}
                    </span>
                    {myUserId === leave.userId && leave.status === "Pending" && (
                      <button
                        onClick={() => handleCancel(leave.leaveId)}
                        className="px-2.5 py-1 rounded-md text-xs border border-border hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const detail = await getLeaveRequestById(leave.leaveId);
                        const impacts = await getLeaveImpacts(leave.leaveId);
                        setDetailMessage(
                          `Leave ${detail.leaveType} (${detail.status}) ${detail.startDate} to ${detail.endDate}, impacts: ${impacts.length}`
                        );
                      }}
                      className="px-2.5 py-1 rounded-md text-xs border border-border hover:bg-secondary transition-colors"
                    >
                      Detail
                    </button>
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
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Vacation</option>
                  <option>Sick</option>
                  <option>CME/Conference</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
      {submitMessage && <p className="mt-3 text-sm text-emerald-600">{submitMessage}</p>}
    </div>
  );
}
