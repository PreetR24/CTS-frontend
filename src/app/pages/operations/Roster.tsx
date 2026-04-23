import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { fetchSites } from "../../../api/masterdataApi";
import {
  createOnCall,
  createRoster,
  createRosterAssignment,
  markRosterAssignmentAbsent,
  publishRoster,
  searchRosters,
  searchOnCall,
  searchRosterAssignments,
  swapRosterAssignment,
  type OnCallDto,
  type RosterAssignmentDto,
} from "../../../api/operationsApi";
import {
  createShiftTemplate,
  searchShiftTemplates,
  updateShiftTemplate,
  type ShiftTemplateDto,
} from "../../../api/operationsPlanningApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import { meApi } from "../../../api/authApi";

type ShiftTemplateForm = {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  role: "Nurse" | "FrontDesk" | "Provider";
  siteId: number;
};

type AssignmentForm = {
  userId: number;
  date: string;
  siteId: number;
  shiftTemplateId: number;
};

export default function OperationsRoster() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [onCalls, setOnCalls] = useState<OnCallDto[]>([]);
  const [assignments, setAssignments] = useState<RosterAssignmentDto[]>([]);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ userId: number; name: string; role: string }>>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplateDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [replacementNurseId, setReplacementNurseId] = useState<number>(0);
  const [assignmentEditReason, setAssignmentEditReason] = useState("");
  const [assignmentEditError, setAssignmentEditError] = useState<string | null>(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = new Date().toISOString().slice(0, 10);
  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    return daysOfWeek.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, []);
  const weekRangeLabel = `${weekDates[0]?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDates[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const {
    register: registerTemplate,
    handleSubmit: submitTemplate,
    watch: watchTemplate,
    reset: resetTemplate,
    formState: { errors: templateErrors },
  } = useForm<ShiftTemplateForm>({
    defaultValues: {
      name: "",
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 30,
      role: "Nurse",
      siteId: 0,
    },
  });
  const {
    register: registerAssign,
    handleSubmit: submitAssign,
    watch: watchAssign,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm<AssignmentForm>({
    defaultValues: {
      userId: 0,
      date: new Date().toISOString().slice(0, 10),
      siteId: 0,
      shiftTemplateId: 0,
    },
  });
  const selectedAssignSiteId = Number(watchAssign("siteId"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onCallList, assignmentList, users, siteList, templates] = await Promise.all([
          searchOnCall(),
          searchRosterAssignments().catch(() => [] as RosterAssignmentDto[]),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchSites({ page: 1, pageSize: 250 }),
          searchShiftTemplates(),
        ]);
        if (cancelled) return;
        setOnCalls(onCallList);
        setAssignments(assignmentList);
        setUserNames(new Map(users.map((u) => [u.userId, u.name])));
        setUsers(users.map((u) => ({ userId: u.userId, name: u.name, role: u.role })));
        setSites(siteList.map((s) => ({ id: s.siteId, name: s.name })));
        setShiftTemplates(templates);
        const defaultSite = siteList[0]?.siteId ?? 0;
        resetTemplate({
          name: "",
          startTime: "08:00",
          endTime: "16:00",
          breakMinutes: 30,
          role: "Nurse",
          siteId: defaultSite,
        });
        const defaultAssignableUser =
          users.find((u) => ["nurse", "frontdesk"].includes(u.role.toLowerCase().trim()))?.userId ?? 0;
        resetAssign({
          userId: defaultAssignableUser,
          date: new Date().toISOString().slice(0, 10),
          siteId: defaultSite,
          shiftTemplateId: templates[0]?.shiftTemplateId ?? 0,
        });
      } catch (e) {
        if (!cancelled) {
          setOnCalls([]);
          setSites([]);
          setError(getErrorMessage(e, "Could not load roster data."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(
    () =>
      shiftTemplates.filter(
        (t) =>
          (!selectedAssignSiteId || t.siteId === selectedAssignSiteId) &&
          (t.role.toLowerCase() === "nurse" || t.role.toLowerCase() === "frontdesk")
      ),
    [shiftTemplates, selectedAssignSiteId]
  );

  const assignableUsers = useMemo(
    () => users.filter((u) => ["nurse", "frontdesk"].includes(u.role.toLowerCase().trim())),
    [users]
  );

  const staffOptionsForCreate = useMemo(() => {
    if (assignableUsers.length > 0) return assignableUsers;
    const ids = Array.from(new Set(assignments.map((a) => a.userId)));
    return ids.map((id) => ({ userId: id, name: userNames.get(id) ?? `User #${id}`, role: "Unknown" }));
  }, [assignableUsers, assignments, userNames]);
  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.assignmentId === editingAssignmentId) ?? null,
    [assignments, editingAssignmentId]
  );
  const selectedAssignmentRole = useMemo(() => {
    if (!selectedAssignment) return "";
    const assignedUser = users.find((u) => u.userId === selectedAssignment.userId);
    if (assignedUser?.role) return assignedUser.role.toLowerCase().trim();
    return (selectedAssignment.role ?? "").toLowerCase().trim();
  }, [selectedAssignment, users]);
  const replacementOptionsForEdit = useMemo(() => {
    if (!selectedAssignment || !selectedAssignmentRole) return [];
    return users
      .filter(
        (u) =>
          u.userId !== selectedAssignment.userId &&
          u.role.toLowerCase().trim() === selectedAssignmentRole
      )
      .map((u) => ({ userId: u.userId, name: u.name, role: u.role }));
  }, [selectedAssignment, selectedAssignmentRole, users]);
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (a.status ?? "").toLowerCase() !== "absent" &&
          (a.status ?? "").toLowerCase() !== "cancelled"
      ),
    [assignments]
  );

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(err)) return err.response?.data?.message ?? fallback;
    if (err instanceof Error) return err.message;
    return fallback;
  };

  const getRosterByDate = (dateIso: string) =>
    assignments.filter((a) => {
      const status = (a.status ?? "").toLowerCase();
      if (status === "absent" || status === "cancelled") return false;
      const role = (a.role ?? "").toLowerCase();
      const rolePass = selectedRole === "all" || role.includes(selectedRole.toLowerCase());
      const sitePass =
        selectedSite === "all" ||
        shiftTemplates.some(
          (t) => t.shiftTemplateId === a.shiftTemplateId && String(t.siteId) === String(selectedSite)
        );
      return a.date === dateIso && rolePass && sitePass;
    });

  const refreshData = async () => {
    const [onCallList, templates, assignmentList] = await Promise.all([
      searchOnCall(selectedSite === "all" ? undefined : { siteId: Number(selectedSite) }),
      searchShiftTemplates(),
      searchRosterAssignments().catch(() => [] as RosterAssignmentDto[]),
    ]);
    setOnCalls(onCallList);
    setShiftTemplates(templates);
    setAssignments(assignmentList);
  };

  const handleCreateTemplate = async (values: ShiftTemplateForm) => {
    if (values.endTime <= values.startTime) {
      setError("Template end time must be after start time.");
      return;
    }
    const hasDuplicateInUi = shiftTemplates.some(
      (t) =>
        (editingTemplateId == null || t.shiftTemplateId !== editingTemplateId) &&
        t.siteId === Number(values.siteId) &&
        t.role.toLowerCase() === values.role.toLowerCase() &&
        t.name.trim().toLowerCase() === values.name.trim().toLowerCase() &&
        t.startTime === values.startTime &&
        t.endTime === values.endTime &&
        t.status.toLowerCase() !== "inactive"
    );
    if (hasDuplicateInUi) {
      setError("Duplicate shift template exists for same site, role, name and time.");
      return;
    }
    try {
      setError(null);
      setNotice(null);
      setIsSubmitting(true);
      if (editingTemplateId) {
        await updateShiftTemplate(editingTemplateId, values);
      } else {
        await createShiftTemplate(values);
      }
      await refreshData();
      setNotice(editingTemplateId ? "Shift template updated successfully." : "Shift template created successfully.");
      setShowTemplateModal(false);
      setEditingTemplateId(null);
      resetTemplate({
        name: "",
        startTime: "08:00",
        endTime: "16:00",
        breakMinutes: 30,
        role: "Nurse",
        siteId: values.siteId,
      });
    } catch (e) {
      setError(getErrorMessage(e, "Could not create shift template."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAssignment = async (values: AssignmentForm) => {
    try {
      const template = shiftTemplates.find((t) => t.shiftTemplateId === Number(values.shiftTemplateId));
      if (!template) {
        setError("Please select a valid shift template.");
        return;
      }
      if (template.role.toLowerCase() !== "nurse") {
        // Allow FrontDesk assignments too, but block any non-compatible staff-role mismatch explicitly below.
      }
      const selectedUser = users.find((u) => u.userId === Number(values.userId));
      if (
        selectedUser &&
        selectedUser.role.toLowerCase().trim() !== template.role.toLowerCase().trim()
      ) {
        setError(
          `Selected staff role '${selectedUser.role}' does not match shift role '${template.role}'.`
        );
        return;
      }
      setError(null);
      setNotice(null);
      setIsSubmitting(true);

      const periodStart = values.date;
      const [year, month, day] = values.date.split("-").map(Number);
      const endDateObj = new Date(year, month - 1, day + 1);
      const periodEnd = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

      const me = await meApi();
      const existingRosters = await searchRosters({ siteId: Number(values.siteId), status: "Draft" });
      const matchingRoster = existingRosters.find(
        (r) =>
          r.department?.toLowerCase().trim() === template.role.toLowerCase().trim() &&
          r.periodStart === periodStart &&
          r.periodEnd === periodEnd
      );
      const roster = matchingRoster
        ? matchingRoster
        : await createRoster({
            siteId: Number(values.siteId),
            department: template.role,
            periodStart,
            periodEnd,
          });
      await createRosterAssignment({
        rosterId: roster.rosterId,
        userId: Number(values.userId),
        shiftTemplateId: Number(values.shiftTemplateId),
        date: values.date,
        role: template.role,
      });

      // Avoid duplicate on-call creation for the same active slot window.
      const hasActiveOverlap = onCalls.some(
        (o) =>
          o.siteId === Number(values.siteId) &&
          o.date === values.date &&
          (o.status ?? "").toLowerCase() === "active" &&
          o.startTime < template.endTime &&
          o.endTime > template.startTime
      );
      if (!hasActiveOverlap) {
        await createOnCall({
          siteId: Number(values.siteId),
          department: template.role,
          date: values.date,
          startTime: template.startTime,
          endTime: template.endTime,
          primaryUserId: Number(values.userId),
        });
      }
      await publishRoster(roster.rosterId, me.userId);
      await refreshData();
      setNotice(
        hasActiveOverlap
          ? "Shift assignment created. Existing on-call coverage already present for this time."
          : "Shift assignment created successfully."
      );
      setShowAssignModal(false);
      resetAssign({
        userId: 0,
        date: values.date,
        siteId: Number(values.siteId),
        shiftTemplateId: Number(values.shiftTemplateId),
      });
    } catch (e) {
      setError(getErrorMessage(e, "Could not create shift assignment."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Roster Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan and manage nurse schedules</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Shift Assignment
        </button>

        <select 
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Sites</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Roles</option>
          <option value="nurse">Nurse</option>
          <option value="frontdesk">FrontDesk</option>
          <option value="provider">Provider</option>
        </select>
        <button
          onClick={() => {
            setEditingTemplateId(null);
            setShowTemplateModal(true);
          }}
          className="px-4 py-2.5 rounded-lg border border-border text-sm"
        >
          Add Shift Template
        </button>
      </div>
      <div className="mb-6 p-4 border border-border rounded-xl bg-card">
        <p className="text-sm font-medium text-foreground mb-2">Shift Templates</p>
        <div className="space-y-2">
          {shiftTemplates.slice(0, 5).map((t) => (
            <div key={t.shiftTemplateId} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>#{t.shiftTemplateId}</span>
              <span>{t.name}</span>
              <span>{t.startTime}-{t.endTime}</span>
              <span>{t.role}</span>
              <span>{t.status}</span>
              <button
                className="px-2 py-1 rounded border border-border"
                onClick={() => {
                  setEditingTemplateId(t.shiftTemplateId);
                  resetTemplate({
                    name: t.name,
                    startTime: t.startTime,
                    endTime: t.endTime,
                    breakMinutes: t.breakMinutes,
                    role: (t.role as ShiftTemplateForm["role"]) ?? "Nurse",
                    siteId: t.siteId,
                  });
                  setShowTemplateModal(true);
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6 p-4 border border-border rounded-xl bg-card">
        <p className="text-sm font-medium text-foreground mb-2">Recent Assignments</p>
        <div className="space-y-2">
          {activeAssignments.slice(0, 8).map((a) => (
            <div
              key={a.assignmentId}
              className="flex items-center justify-between gap-3 text-xs text-muted-foreground border border-border rounded-lg px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span>{userNames.get(a.userId) ?? a.userId} - {a.role}</span>
                <span>Date: {a.date}</span>
                <span>Template: #{a.shiftTemplateId}</span>
                <span className="px-2 py-1 rounded bg-secondary text-foreground">Status: {a.status}</span>
              </div>
              <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded border border-border"
                onClick={() => {
                  setEditingAssignmentId(a.assignmentId);
                  setReplacementNurseId(0);
                  setAssignmentEditReason("Roster adjustment");
                  setAssignmentEditError(null);
                }}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 rounded border border-border"
                onClick={async () => {
                  try {
                    setError(null);
                    setNotice(null);
                    await markRosterAssignmentAbsent(a.assignmentId, {
                      reason: "Removed by operations from roster page",
                    });
                    await refreshData();
                    setNotice("Assignment removed successfully.");
                  } catch (e) {
                    setError(getErrorMessage(e, "Could not remove assignment."));
                  }
                }}
              >
                Delete
              </button>
              </div>
            </div>
          ))}
          {activeAssignments.length === 0 && (
            <p className="text-sm text-muted-foreground">No active assignments to show.</p>
          )}
        </div>
      </div>

      {/* Weekly Roster Grid */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Weekly Schedule</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{weekRangeLabel}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground sticky left-0 bg-secondary/30">
                  Day
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Morning Shift<br/><span className="font-normal">(8AM - 4PM)</span>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Evening Shift<br/><span className="font-normal">(4PM - 12AM)</span>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground min-w-[150px]">
                  Night Shift<br/><span className="font-normal">(12AM - 8AM)</span>
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                  Total Staff
                </th>
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((day, index) => {
                const currentDate = weekDates[index];
                const currentDateIso = currentDate
                  ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(
                      currentDate.getDate()
                    ).padStart(2, "0")}`
                  : "";
                const dayShifts = currentDateIso ? getRosterByDate(currentDateIso) : [];
                const morningShifts = dayShifts.filter((s) =>
                  shiftTemplates.some(
                    (t) =>
                      t.shiftTemplateId === s.shiftTemplateId &&
                      (t.startTime.startsWith("08") || t.startTime.startsWith("8:"))
                  )
                );
                const eveningShifts = dayShifts.filter((s) =>
                  shiftTemplates.some(
                    (t) =>
                      t.shiftTemplateId === s.shiftTemplateId &&
                      (t.startTime.startsWith("16") || t.startTime.startsWith("4:"))
                  )
                );
                const nightShifts = dayShifts.filter((s) =>
                  shiftTemplates.some(
                    (t) =>
                      t.shiftTemplateId === s.shiftTemplateId &&
                      (t.startTime.startsWith("00") || t.startTime.startsWith("0:"))
                  )
                );
                const totalVisibleAssignments =
                  morningShifts.length + eveningShifts.length + nightShifts.length;
                const roleSummary = (items: RosterAssignmentDto[]) => {
                  const nurseCount = items.filter((i) => (i.role ?? "").toLowerCase() === "nurse").length;
                  const frontDeskCount = items.filter((i) => (i.role ?? "").toLowerCase() === "frontdesk").length;
                  const parts: string[] = [];
                  if (nurseCount > 0) parts.push(`${nurseCount} Nurse`);
                  if (frontDeskCount > 0) parts.push(`${frontDeskCount} FrontDesk`);
                  if (parts.length === 0) return "No assignments";
                  return parts.join(", ");
                };

                return (
                  <tr key={day} className="border-b border-border hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sticky left-0 bg-card">
                      <div>
                        <p className="text-sm font-medium text-foreground">{day}</p>
                        <p className="text-xs text-muted-foreground">
                          {weekDates[index]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {morningShifts.length > 0 ? (
                          <span className="px-2 py-1 rounded-md bg-[#f0b895]/20 text-xs text-foreground">
                            {roleSummary(morningShifts)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {eveningShifts.length > 0 ? (
                          <span className="px-2 py-1 rounded-md bg-[#a68fcf]/20 text-xs text-foreground">
                            {roleSummary(eveningShifts)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {nightShifts.length > 0 ? (
                          <span className="px-2 py-1 rounded-md bg-[#6b9bd1]/20 text-xs text-foreground">
                            {roleSummary(nightShifts)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-lg font-medium text-foreground">{totalVisibleAssignments}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Add Shift Assignment</h3>
            <form className="space-y-4" onSubmit={submitAssign(handleCreateAssignment)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Staff Member</label>
                <select
                  {...registerAssign("userId", { valueAsNumber: true, min: { value: 1, message: "Select staff member." } })}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={0}>Select staff member</option>
                  {staffOptionsForCreate.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.name} - {u.role}</option>
                  ))}
                </select>
                {assignErrors.userId && <p className="text-xs text-destructive mt-1">{assignErrors.userId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                  <input 
                    type="date" 
                    {...registerAssign("date", { required: "Date is required." })}
                    min={today}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                  {assignErrors.date && <p className="text-xs text-destructive mt-1">{assignErrors.date.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Site</label>
                  <select
                    {...registerAssign("siteId", { valueAsNumber: true, min: { value: 1, message: "Select site." } })}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>Select site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                  {assignErrors.siteId && <p className="text-xs text-destructive mt-1">{assignErrors.siteId.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Shift Template</label>
                <select
                  {...registerAssign("shiftTemplateId", { valueAsNumber: true, min: { value: 1, message: "Select shift template." } })}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={0}>Select template</option>
                  {filteredTemplates.map((t) => (
                    <option key={t.shiftTemplateId} value={t.shiftTemplateId}>
                      {t.name} ({t.startTime}-{t.endTime}) [{t.role}]
                    </option>
                  ))}
                </select>
                {assignErrors.shiftTemplateId && <p className="text-xs text-destructive mt-1">{assignErrors.shiftTemplateId.message}</p>}
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAssign(handleCreateAssignment)()}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all disabled:opacity-60"
              >
                {isSubmitting ? "Assigning..." : "Assign Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">
              {editingTemplateId ? "Edit Shift Template" : "Add Shift Template"}
            </h3>
            <form className="space-y-4" onSubmit={submitTemplate(handleCreateTemplate)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Template Name</label>
                <input
                  type="text"
                  {...registerTemplate("name", { required: "Template name is required.", minLength: { value: 3, message: "Name too short." } })}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm"
                />
                {templateErrors.name && <p className="text-xs text-destructive mt-1">{templateErrors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Time</label>
                  <input type="time" {...registerTemplate("startTime", { required: "Start time required." })} className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Time</label>
                  <input type="time" {...registerTemplate("endTime", { required: "End time required." })} className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Break Minutes</label>
                  <input type="number" min={0} max={120} {...registerTemplate("breakMinutes", { valueAsNumber: true, min: { value: 0, message: "Invalid break." }, max: { value: 120, message: "Break too long." } })} className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm" />
                  {templateErrors.breakMinutes && <p className="text-xs text-destructive mt-1">{templateErrors.breakMinutes.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select {...registerTemplate("role")} className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm">
                    <option value="Nurse">Nurse</option>
                    <option value="FrontDesk">FrontDesk</option>
                    <option value="Provider">Provider</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Site</label>
                <select {...registerTemplate("siteId", { valueAsNumber: true, min: { value: 1, message: "Select site." } })} className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-sm">
                  <option value={0}>Select site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
                {templateErrors.siteId && <p className="text-xs text-destructive mt-1">{templateErrors.siteId.message}</p>}
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all">
                Cancel
              </button>
              <button type="submit" onClick={() => void submitTemplate(handleCreateTemplate)()} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {isSubmitting ? "Saving..." : editingTemplateId ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingAssignmentId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-xl shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Assignment</h3>
            {selectedAssignment && (
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Current Staff Member</p>
                  <p className="font-medium text-foreground">
                    {userNames.get(selectedAssignment.userId) ?? `User #${selectedAssignment.userId}`}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Assignment Date</p>
                  <p className="font-medium text-foreground">{selectedAssignment.date}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Shift Template</p>
                  <p className="font-medium text-foreground">
                    {shiftTemplates.find((t) => t.shiftTemplateId === selectedAssignment.shiftTemplateId)?.name ??
                      `Template #${selectedAssignment.shiftTemplateId}`}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{selectedAssignment.status}</p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Replacement Staff Member</label>
                <select
                  value={replacementNurseId}
                  onChange={(e) => {
                    setReplacementNurseId(Number(e.target.value));
                    setAssignmentEditError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                >
                  <option value={0}>Select staff member</option>
                  {replacementOptionsForEdit.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} - {u.role}
                    </option>
                  ))}
                </select>
                {replacementOptionsForEdit.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No other staff member is available for this role.
                  </p>
                )}
                {assignmentEditError && (
                  <p className="text-xs text-destructive mt-1">{assignmentEditError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
                <input
                  type="text"
                  value={assignmentEditReason}
                  onChange={(e) => setAssignmentEditReason(e.target.value)}
                  placeholder="Enter reason for reassignment"
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingAssignmentId(null);
                  setAssignmentEditReason("");
                  setAssignmentEditError(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!replacementNurseId) {
                    setAssignmentEditError("Replacement staff member is required.");
                    return;
                  }
                  try {
                    setError(null);
                    setNotice(null);
                    await swapRosterAssignment(editingAssignmentId, {
                      newUserId: replacementNurseId,
                      reason: assignmentEditReason.trim() || "Updated from roster assignment edit",
                    });
                    await refreshData();
                    setEditingAssignmentId(null);
                    setAssignmentEditReason("");
                    setNotice("Assignment updated successfully.");
                  } catch (e) {
                    setError(getErrorMessage(e, "Could not update assignment."));
                  }
                }}
                disabled={!replacementNurseId}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
