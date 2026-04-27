import { useEffect, useMemo, useState } from "react";
import { Check, X, Calendar, AlertCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { approveLeave, rejectLeave, searchLeaveRequests, type LeaveRequestDto } from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import { resolveLeaveImpact, searchLeaveImpactsByLeaveId } from "../../../api/operationsPlanningApi";
import { getAppointmentById, type AppointmentDto } from "../../../api/appointmentsApi";
import { fetchServices, type ServiceDto } from "../../../api/masterdataApi";
import { meApi } from "../../../api/authApi";

type ImpactAppointmentRow = {
  appointmentId: number;
  patientName: string;
  slotTime: string;
  serviceName: string;
  visitType: string;
};

type LeaveImpactDetailRow = {
  impactId: number;
  impactType: string;
  status: string;
  resolvedDate: string | null;
  appointments: ImpactAppointmentRow[];
};

function parseAppointmentIds(impactJson: string | null): number[] {
  if (!impactJson) return [];
  try {
    const parsed = JSON.parse(impactJson) as { appointmentIds?: unknown };
    if (!Array.isArray(parsed.appointmentIds)) return [];
    return parsed.appointmentIds
      .filter((id): id is number => typeof id === "number" && Number.isInteger(id))
      .filter((id, idx, arr) => arr.indexOf(id) === idx);
  } catch {
    return [];
  }
}

function toImpactAppointmentRow(appointment: AppointmentDto, services: Map<number, ServiceDto>): ImpactAppointmentRow {
  const service = services.get(appointment.serviceId);
  return {
    appointmentId: appointment.appointmentId,
    patientName: appointment.patientName?.trim() || `Patient ${appointment.patientId}`,
    slotTime: `${appointment.slotDate} ${appointment.startTime}-${appointment.endTime}`,
    serviceName: appointment.serviceName?.trim() || service?.name || `Service ${appointment.serviceId}`,
    visitType: service?.visitType || "N/A",
  };
}

export default function OperationsLeave() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [impactCountByLeave, setImpactCountByLeave] = useState<Map<number, number>>(new Map());
  const [impactIdsByLeave, setImpactIdsByLeave] = useState<Map<number, number[]>>(new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailLeave, setDetailLeave] = useState<LeaveRequestDto | null>(null);
  const [detailImpacts, setDetailImpacts] = useState<LeaveImpactDetailRow[]>([]);
  const [serviceById, setServiceById] = useState<Map<number, ServiceDto>>(new Map());
  const [statusFilter, setStatusFilter] = useState("All");
  const [nurseFilter, setNurseFilter] = useState("");

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(err)) return err.response?.data?.message ?? fallback;
    if (err instanceof Error) return err.message;
    return fallback;
  };

  const refresh = async () => {
    const list = await searchLeaveRequests();
    setLeaveRequests(list);
    const impactLists = await Promise.all(
      list.map((l) =>
        searchLeaveImpactsByLeaveId(l.leaveId).catch(() => [])
      )
    );
    setImpactCountByLeave(new Map(list.map((l, idx) => [l.leaveId, impactLists[idx].length])));
    setImpactIdsByLeave(new Map(list.map((l, idx) => [l.leaveId, impactLists[idx].map((x) => x.impactId)])));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leaveList, users] = await Promise.all([
          searchLeaveRequests(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        setLeaveRequests(leaveList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        const services = await fetchServices().catch(() => [] as ServiceDto[]);
        if (!cancelled) {
          setServiceById(new Map(services.map((service) => [service.serviceId, service])));
        }
        const impactLists = await Promise.all(
          leaveList.map((l) => searchLeaveImpactsByLeaveId(l.leaveId).catch(() => []))
        );
        if (cancelled) return;
        setImpactCountByLeave(new Map(leaveList.map((l, idx) => [l.leaveId, impactLists[idx].length])));
        setImpactIdsByLeave(new Map(leaveList.map((l, idx) => [l.leaveId, impactLists[idx].map((x) => x.impactId)])));
      } catch {
        if (!cancelled) setLeaveRequests([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viewRows = leaveRequests.map((l) => ({
    id: l.leaveId,
    nurse: userNames.get(l.userId) ?? "Nurse",
    type: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    status: l.status,
    impactedAppts: impactCountByLeave.get(l.leaveId) ?? 0,
  }));
  const filteredRows = useMemo(
    () =>
      viewRows.filter((row) => {
        const statusPass = statusFilter === "All" || row.status === statusFilter;
        const nursePass = !nurseFilter || row.nurse.toLowerCase().includes(nurseFilter.toLowerCase());
        return statusPass && nursePass;
      }),
    [viewRows, statusFilter, nurseFilter]
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
        <p className="text-sm text-muted-foreground mt-1">Review and approve nurse leave requests</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
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
      <div className="bg-card rounded-xl border border-border p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Staff Name</label>
          <input
            value={nurseFilter}
            onChange={(e) => setNurseFilter(e.target.value)}
            placeholder="Search by name"
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <h3 className="text-sm font-medium text-foreground">All Leave Requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Review and take action</p>
        </div>

        <div className="divide-y divide-border">
          {filteredRows.map((leave) => {
            const colors = getStatusColor(leave.status);
            return (
              <div key={leave.id} className="p-5 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Nurse Info */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6b9bd1] to-[#5a8bc1] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-base font-medium text-foreground">{leave.nurse}</p>
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
                      <div className="mt-2 flex gap-2">
                        <button
                          className="px-2 py-1 rounded border border-border text-xs"
                          onClick={async () => {
                            try {
                              setError(null);
                              const detail = leaveRequests.find((x) => x.leaveId === leave.id) ?? null;
                              const impacts = await searchLeaveImpactsByLeaveId(leave.id);
                              const enrichedImpacts = await Promise.all(
                                impacts.map(async (x) => {
                                  const appointmentIds = parseAppointmentIds(x.impactJson);
                                  const appointments = (
                                    await Promise.all(
                                      appointmentIds.map((appointmentId) =>
                                        getAppointmentById(appointmentId).catch(() => null)
                                      )
                                    )
                                  )
                                    .filter((a): a is AppointmentDto => a != null)
                                    .map((a) => toImpactAppointmentRow(a, serviceById));
                                  return {
                                    impactId: x.impactId,
                                    impactType: x.impactType,
                                    status: x.status,
                                    resolvedDate: x.resolvedDate,
                                    appointments,
                                  };
                                })
                              );
                              setDetailLeave(detail);
                              setDetailImpacts(enrichedImpacts);
                            } catch (e) {
                              setError(getErrorMessage(e, "Could not load leave details."));
                            }
                          }}
                        >
                          View Detail
                        </button>
                        {leave.impactedAppts > 0 && (
                          <button
                            className="px-2 py-1 rounded border border-border text-xs"
                            onClick={async () => {
                              try {
                                setError(null);
                                const impacts = await searchLeaveImpactsByLeaveId(leave.id);
                                const enrichedImpacts = await Promise.all(
                                  impacts.map(async (x) => {
                                    const appointmentIds = parseAppointmentIds(x.impactJson);
                                    const appointments = (
                                      await Promise.all(
                                        appointmentIds.map((appointmentId) =>
                                          getAppointmentById(appointmentId).catch(() => null)
                                        )
                                      )
                                    )
                                      .filter((a): a is AppointmentDto => a != null)
                                      .map((a) => toImpactAppointmentRow(a, serviceById));
                                    return {
                                      impactId: x.impactId,
                                      impactType: x.impactType,
                                      status: x.status,
                                      resolvedDate: x.resolvedDate,
                                      appointments,
                                    };
                                  })
                                );
                                setDetailLeave(leaveRequests.find((x) => x.leaveId === leave.id) ?? null);
                                setDetailImpacts(enrichedImpacts);
                              } catch (e) {
                                setError(getErrorMessage(e, "Could not load impact details."));
                              }
                            }}
                          >
                            Impact Detail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {leave.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            setError(null);
                            const impacts = await searchLeaveImpactsByLeaveId(leave.id);
                            const unresolved = impacts.filter((x) => x.status.toLowerCase() !== "resolved");
                            if (unresolved.length > 0) {
                              setError(
                                "You can approve leave only after all impacts are resolved."
                              );
                              return;
                            }
                            await approveLeave(leave.id);
                            await refresh();
                            setNotice("Leave request approved.");
                          } catch (e) {
                            setError(getErrorMessage(e, "Could not approve leave request."));
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-[#95d4a8] text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setError(null);
                            await rejectLeave(leave.id);
                            const me = await meApi();
                            const impacts = impactIdsByLeave.get(leave.id) ?? [];
                            await Promise.all(impacts.map((impactId) => resolveLeaveImpact(impactId, me.userId)));
                            await refresh();
                            setNotice("Leave request rejected.");
                          } catch (e) {
                            setError(getErrorMessage(e, "Could not reject leave request."));
                          }
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
          {filteredRows.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">No leave requests found for selected filters.</div>
          )}
        </div>
      </div>
      {detailLeave && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-2xl shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-3">Leave Details</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {detailLeave.leaveType} ({detailLeave.status}) - {detailLeave.startDate} to {detailLeave.endDate}
            </p>
            <div className="space-y-2 max-h-64 overflow-auto">
              {detailImpacts.length === 0 && (
                <p className="text-sm text-muted-foreground">No impacts found for this leave request.</p>
              )}
              {detailImpacts.map((impact) => (
                <div key={impact.impactId} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">Impact #{impact.impactId}</p>
                  <p className="text-xs text-muted-foreground">
                    {impact.impactType} - {impact.status} - Resolved: {impact.resolvedDate ?? "No"}
                  </p>
                  {impact.appointments.length > 0 && (
                    <div className="mt-2 rounded border border-border overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border">
                            <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Patient</th>
                            <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Slot Time</th>
                            <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Service</th>
                            <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Visit Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {impact.appointments.map((appointment) => (
                            <tr key={`${impact.impactId}-${appointment.appointmentId}`} className="border-b border-border last:border-0">
                              <td className="py-1.5 px-2 text-xs text-foreground">{appointment.patientName}</td>
                              <td className="py-1.5 px-2 text-xs text-muted-foreground">{appointment.slotTime}</td>
                              <td className="py-1.5 px-2 text-xs text-muted-foreground">{appointment.serviceName}</td>
                              <td className="py-1.5 px-2 text-xs text-muted-foreground">{appointment.visitType}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {impact.status.toLowerCase() !== "resolved" && (
                    <button
                      className="mt-2 px-3 py-1 rounded border border-border text-xs hover:bg-secondary"
                      onClick={async () => {
                        try {
                          setError(null);
                          const me = await meApi();
                          await resolveLeaveImpact(impact.impactId, me.userId);
                          const impacts = await searchLeaveImpactsByLeaveId(detailLeave.leaveId);
                          const enrichedImpacts = await Promise.all(
                            impacts.map(async (x) => {
                              const appointmentIds = parseAppointmentIds(x.impactJson);
                              const appointments = (
                                await Promise.all(
                                  appointmentIds.map((appointmentId) =>
                                    getAppointmentById(appointmentId).catch(() => null)
                                  )
                                )
                              )
                                .filter((a): a is AppointmentDto => a != null)
                                .map((a) => toImpactAppointmentRow(a, serviceById));
                              return {
                                impactId: x.impactId,
                                impactType: x.impactType,
                                status: x.status,
                                resolvedDate: x.resolvedDate,
                                appointments,
                              };
                            })
                          );
                          setDetailImpacts(enrichedImpacts);
                          await refresh();
                          setNotice(`Impact #${impact.impactId} resolved.`);
                        } catch (e) {
                          setError(getErrorMessage(e, "Could not resolve impact."));
                        }
                      }}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setDetailLeave(null);
                  setDetailImpacts([]);
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
