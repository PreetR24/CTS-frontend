import { useEffect, useMemo, useState } from "react";
import { Check, X, Calendar, AlertCircle } from "lucide-react";
import {
  approveLeave,
  rejectLeave,
  searchLeaveRequests,
  type LeaveRequestDto,
} from "../../../api/operationsApi";
import { fetchUsers } from "../../../api/usersApi";

export default function OperationsLeave() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());

  const refresh = async () => {
    const list = await searchLeaveRequests();
    setLeaveRequests(list);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leaveList, users] = await Promise.all([
          searchLeaveRequests(),
          fetchUsers({ page: 1, pageSize: 500 }),
        ]);
        if (cancelled) return;
        setLeaveRequests(leaveList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
      } catch {
        if (!cancelled) setLeaveRequests([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viewRows = useMemo(
    () =>
      leaveRequests.map((l) => ({
        id: l.leaveId,
        staff: userNames.get(l.userId) ?? `User #${l.userId}`,
        type: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        impactedAppts: 0,
      })),
    [leaveRequests, userNames]
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Pending": return { bg: "bg-[#f0b895]/20", text: "text-[#d89768]", border: "border-[#f0b895]" };
      case "Approved": return { bg: "bg-[#95d4a8]/20", text: "text-[#75b488]", border: "border-[#95d4a8]" };
      case "Rejected": return { bg: "bg-[#e8a0a0]/20", text: "text-[#d88080]", border: "border-[#e8a0a0]" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve staff leave requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-xl border-2 border-[#f0b895]/30 bg-[#f0b895]/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <AlertCircle className="w-5 h-5 text-[#d89768]" />
          </div>
          <p className="text-3xl font-medium text-foreground">
            {viewRows.filter(l => l.status === "Pending").length}
          </p>
        </div>
        <div className="p-5 rounded-xl border-2 border-[#95d4a8]/30 bg-[#95d4a8]/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Approved This Month</p>
            <Check className="w-5 h-5 text-[#75b488]" />
          </div>
          <p className="text-3xl font-medium text-foreground">
            {viewRows.filter(l => l.status === "Approved").length}
          </p>
        </div>
        <div className="p-5 rounded-xl border-2 border-[#e8a0a0]/30 bg-[#e8a0a0]/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <X className="w-5 h-5 text-[#d88080]" />
          </div>
          <p className="text-3xl font-medium text-foreground">
            {viewRows.filter(l => l.status === "Rejected").length}
          </p>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <h3 className="text-sm font-medium text-foreground">All Leave Requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Review and take action</p>
        </div>

        <div className="divide-y divide-border">
          {viewRows.map((leave) => {
            const colors = getStatusColor(leave.status);
            return (
              <div key={leave.id} className="p-5 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Staff Info */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-base font-medium text-foreground">{leave.staff}</p>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {leave.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                          <p className="text-sm font-medium text-foreground">{leave.type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="text-sm font-medium text-foreground">
                            {leave.startDate} to {leave.endDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Impact</p>
                          <p className="text-sm font-medium text-foreground">
                            {leave.impactedAppts} appointments
                          </p>
                        </div>
                      </div>

                      {leave.impactedAppts > 0 && (
                        <div className="p-3 rounded-lg bg-[#f0b895]/10 border border-[#f0b895]/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-[#d89768] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground">
                              This leave will affect {leave.impactedAppts} scheduled appointments. 
                              Coverage arrangements required.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {leave.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await approveLeave(leave.id);
                          await refresh();
                        }}
                        className="px-4 py-2 rounded-lg bg-[#95d4a8] text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await rejectLeave(leave.id);
                          await refresh();
                        }}
                        className="px-4 py-2 rounded-lg bg-[#e8a0a0] text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
