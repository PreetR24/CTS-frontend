import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
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

type LeaveFormValues = {
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedImpacts, setSelectedImpacts] = useState<Array<{ impactId: number; status: string; impactType: string }>>([]);
  const [selectedLeaveMeta, setSelectedLeaveMeta] = useState<{
    leaveType: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeaveFormValues>({
    defaultValues: {
      leaveType: "Vacation",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (cancelled) return;
        setMyUserId(me.userId);
        if (!me.userId) {
          setLeaves([]);
          return;
        }
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

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? fallback;
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const submitLeave = async (values: LeaveFormValues) => {
    if (values.startDate < today) {
      setActionError("Start date cannot be in the past.");
      return;
    }
    if (values.endDate < values.startDate) {
      setActionError("End date cannot be earlier than start date.");
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);
    setActionError(null);
    try {
      const created = await submitLeaveRequest({
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined,
      });
      try {
        await createLeaveImpact({
          leaveId: created.leaveId,
          impactType: "ProviderLeave",
          impactJson: JSON.stringify({
            leaveType: values.leaveType,
            startDate: values.startDate,
            endDate: values.endDate,
            reason: values.reason || null,
          }),
        });
      } catch {
        // Keep leave submission successful even if impact creation fails.
      }
      setLeaves((prev) => [created, ...prev]);
      const impactsForCreated = await getLeaveImpacts(created.leaveId).catch(() => []);
      setImpactCountByLeave((prev) => {
        const next = new Map(prev);
        next.set(created.leaveId, impactsForCreated.length);
        return next;
      });
      setShowModal(false);
      setSubmitMessage("Leave request submitted.");
      reset({
        leaveType: "Vacation",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not submit leave request."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (leaveId: number) => {
    const current = leaves.find((l) => l.leaveId === leaveId);
    if (!current || current.status !== "Pending") {
      setActionError("Only pending leave requests can be cancelled.");
      return;
    }
    try {
      setActionError(null);
      const updated = await cancelLeave(leaveId);
      setLeaves((prev) => prev.map((l) => (l.leaveId === leaveId ? updated : l)));
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not cancel leave request."));
    }
  };

  const loadLeaveDetails = async (leaveId: number) => {
    try {
      setActionError(null);
      const detail = await getLeaveRequestById(leaveId);
      const impacts = await getLeaveImpacts(leaveId);
      setSelectedImpacts(
        impacts.map((i) => ({ impactId: i.impactId, status: i.status, impactType: i.impactType }))
      );
      setSelectedLeaveMeta({
        leaveType: detail.leaveType,
        status: detail.status,
        startDate: detail.startDate,
        endDate: detail.endDate,
      });
      setDetailMessage(
        `Leave ${detail.leaveType} (${detail.status}) ${detail.startDate} to ${detail.endDate}, impacts: ${impacts.length}`
      );
    } catch (error) {
      setSelectedImpacts([]);
      setDetailMessage(null);
      setSelectedLeaveMeta(null);
      setActionError(getErrorMessage(error, "Unable to load leave detail right now."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Leave Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your time-off requests</p>
        {actionError && <p className="text-sm text-destructive mt-2">{actionError}</p>}
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
                      onClick={() => void loadLeaveDetails(leave.leaveId)}
                      className="px-2.5 py-1 rounded-md text-xs border border-border hover:bg-secondary transition-colors"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {leaveRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-sm text-muted-foreground text-center">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Request Leave</h3>
            <form className="space-y-4" onSubmit={handleSubmit(submitLeave)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Leave Type</label>
                <select
                  {...register("leaveType", { required: "Leave type is required." })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Vacation</option>
                  <option>Sick</option>
                  <option>CME/Conference</option>
                  <option>Other</option>
                </select>
                {errors.leaveType && <p className="text-xs text-destructive mt-1">{errors.leaveType.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                  <input
                    type="date"
                    min={today}
                    {...register("startDate", { required: "Start date is required." })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Date</label>
                  <input
                    type="date"
                    min={today}
                    {...register("endDate", { required: "End date is required." })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea
                  rows={3}
                  {...register("reason")}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Optional notes..."
                />
                {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {submitMessage && <p className="mt-3 text-sm text-emerald-600">{submitMessage}</p>}
      {selectedLeaveMeta && (
        <div className="mt-4 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">Leave Impact Details</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedLeaveMeta.leaveType}: {selectedLeaveMeta.startDate} to {selectedLeaveMeta.endDate}
              </p>
            </div>
            <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-[#7ba3c0]/20 text-foreground">
              Leave {selectedLeaveMeta.status}
            </span>
          </div>
          {selectedImpacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No impacted appointments for this leave.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedImpacts.map((impact) => (
                <div key={impact.impactId} className="rounded-lg border border-border p-3 bg-secondary/20">
                  <p className="text-xs text-muted-foreground">Impact #{impact.impactId}</p>
                  <p className="text-sm text-foreground mt-1">{impact.impactType}</p>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                  <p className="text-sm font-medium text-foreground">{impact.status}</p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              setSelectedLeaveMeta(null);
              setSelectedImpacts([]);
              setDetailMessage(null);
            }}
            className="mt-4 w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
          >
            Close Impact Details
          </button>
        </div>
      )}
      {detailMessage && !selectedLeaveMeta && (
        <div className="mt-3 bg-card rounded-xl border border-border p-3">
          <p className="text-sm text-muted-foreground">{detailMessage}</p>
        </div>
      )}
    </div>
  );
}
