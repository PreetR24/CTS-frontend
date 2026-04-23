import { useEffect, useMemo, useState } from "react";
import { Phone, AlertCircle, Clock, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import {
  createOnCall,
  getOnCallById,
  searchOnCall,
  updateOnCall,
  type CreateOnCallPayload,
} from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";
import { fetchSites } from "../../../api/masterdataApi";

type OnCallRow = {
  id: number;
  date: string;
  day: string;
  department: string;
  primary: string;
  backup: string;
  contact: string;
  shift: string;
  siteId: number;
  primaryUserId: number;
  backupUserId: number | null;
  status: string;
};

export default function OperationsOnCall() {
  const [rows, setRows] = useState<OnCallRow[]>([]);
  const [editOnCallId, setEditOnCallId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [sites, setSites] = useState<Array<{ siteId: number; name: string }>>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<{
    siteId: number;
    department: string;
    date: string;
    startTime: string;
    endTime: string;
    primaryUserId: number;
    backupUserId?: number;
    status: string;
  }>({
    defaultValues: {
      siteId: 0,
      department: "Nurse",
      date: new Date().toISOString().slice(0, 10),
      startTime: "08:00",
      endTime: "16:00",
      primaryUserId: 0,
      backupUserId: undefined,
      status: "Active",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onCalls, users, siteList] = await Promise.all([
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
          fetchSites({ page: 1, pageSize: 250 }),
        ]);
        if (cancelled) return;
        setUsers(users);
        setSites(siteList);
        const names = new Map(users.map((u) => [u.userId, u.name]));
        reset({
          siteId: siteList[0]?.siteId ?? 0,
          department: "Nurse",
          date: new Date().toISOString().slice(0, 10),
          startTime: "08:00",
          endTime: "16:00",
          primaryUserId: users.find((u) => u.role.toLowerCase() === "nurse")?.userId ?? 0,
          backupUserId: undefined,
          status: "Active",
        });
        setRows(
          onCalls.map((o) => ({
            id: o.onCallId,
            date: o.date,
            day: new Date(`${o.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
            department: o.department ?? "General",
            primary: names.get(o.primaryUserId) ?? "Team Member",
            backup: o.backupUserId ? names.get(o.backupUserId) ?? "Team Member" : "—",
            contact: "+91 00000 00000",
            shift: `${o.startTime}-${o.endTime}`,
            siteId: o.siteId,
            primaryUserId: o.primaryUserId,
            backupUserId: o.backupUserId,
            status: o.status,
          }))
        );
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCallSchedule = useMemo(
    () =>
      rows.filter((row) => {
        const statusPass = statusFilter === "All" || row.status === statusFilter;
        const datePass = !dateFilter || row.date === dateFilter;
        const deptPass = !departmentFilter || row.department.toLowerCase().includes(departmentFilter.toLowerCase());
        return statusPass && datePass && deptPass;
      }),
    [rows, statusFilter, dateFilter, departmentFilter]
  );
  const watchedStartTime = watch("startTime");
  const nurseOptions = (() => {
    const fromUsers = users.filter((u) => u.role.toLowerCase().includes("nurse"));
    if (fromUsers.length > 0) return fromUsers.map((u) => ({ userId: u.userId, name: u.name }));
    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.primaryUserId, r.backupUserId].filter((x): x is number => !!x)))
    );
    return ids.map((id) => ({ userId: id, name: `Nurse #${id}` }));
  })();
  const selectedPrimaryInForm = Number(watch("primaryUserId"));

  const getShiftColor = (shift: string) => {
    return shift.includes("08") || shift.includes("8") ? "bg-[#f0b895]/20 text-[#d89768]" : "bg-[#a68fcf]/20 text-[#9478bf]";
  };

  const getDepartmentColor = (dept: string) => {
    switch(dept) {
      case "Emergency": return "bg-[#e8a0a0]/20 text-[#d88080]";
      case "ICU": return "bg-[#6b9bd1]/20 text-[#5a8bc1]";
      case "Surgery": return "bg-[#95d4a8]/20 text-[#75b488]";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(err)) return err.response?.data?.message ?? fallback;
    if (err instanceof Error) return err.message;
    return fallback;
  };

  const openEditDepartmentModal = async (onCallId: number) => {
    try {
      setError(null);
      const detail = await getOnCallById(onCallId);
      setEditOnCallId(onCallId);
      reset({
        siteId: detail.siteId,
        department: detail.department ?? "Nurse",
        date: detail.date,
        startTime: detail.startTime,
        endTime: detail.endTime,
        primaryUserId: detail.primaryUserId,
        backupUserId: detail.backupUserId ?? undefined,
        status: detail.status,
      });
    } catch (e) {
      setError(getErrorMessage(e, "Could not load on-call details."));
    }
  };

  const closeEditDepartmentModal = () => {
    setEditOnCallId(null);
    setError(null);
  };

  const refreshRows = async () => {
    const [list, fetchedUsers] = await Promise.all([
      searchOnCall(),
      fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
    ]);
    const names = new Map(fetchedUsers.map((u) => [u.userId, u.name]));
    setRows(
      list.map((o) => ({
        id: o.onCallId,
        date: o.date,
        day: new Date(`${o.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
        department: o.department ?? "Nurse",
        primary: names.get(o.primaryUserId) ?? "Nurse",
        backup: o.backupUserId ? names.get(o.backupUserId) ?? "Nurse" : "—",
        contact: "+91 00000 00000",
        shift: `${o.startTime}-${o.endTime}`,
        siteId: o.siteId,
        primaryUserId: o.primaryUserId,
        backupUserId: o.backupUserId,
        status: o.status,
      }))
    );
  };

  const saveOnCall = async (values: {
    siteId: number;
    department: string;
    date: string;
    startTime: string;
    endTime: string;
    primaryUserId: number;
    backupUserId?: number;
    status: string;
  }) => {
    if (editOnCallId == null) return;
    if (values.endTime <= values.startTime) {
      setError("End time must be greater than start time.");
      return;
    }
    if (values.primaryUserId === values.backupUserId) {
      setError("Backup nurse cannot be same as primary nurse.");
      return;
    }
    try {
      setError(null);
      setNotice(null);
      await updateOnCall(editOnCallId, {
        siteId: Number(values.siteId),
        department: values.department.trim(),
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        primaryUserId: Number(values.primaryUserId),
        backupUserId: values.backupUserId ? Number(values.backupUserId) : 0,
        status: values.status,
      });
      await refreshRows();
      setNotice("On-call record updated.");
      setEditOnCallId(null);
    } catch (e) {
      setError(getErrorMessage(e, "Could not update on-call record."));
    }
  };

  const createOnCallRecord = async (values: {
    siteId: number;
    department: string;
    date: string;
    startTime: string;
    endTime: string;
    primaryUserId: number;
    backupUserId?: number;
    status: string;
  }) => {
    if (values.endTime <= values.startTime) {
      setError("End time must be greater than start time.");
      return;
    }
    if (values.primaryUserId === values.backupUserId) {
      setError("Backup nurse cannot be same as primary nurse.");
      return;
    }
    try {
      setError(null);
      setNotice(null);
      const payload: CreateOnCallPayload = {
        siteId: Number(values.siteId),
        department: values.department.trim(),
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        primaryUserId: Number(values.primaryUserId),
        backupUserId: values.backupUserId ? Number(values.backupUserId) : undefined,
      };
      await createOnCall(payload);
      await refreshRows();
      setNotice("On-call record created.");
      setCreateOpen(false);
    } catch (e) {
      setError(getErrorMessage(e, "Could not create on-call record."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">On-Call Coverage</h1>
        <p className="text-sm text-muted-foreground mt-1">Emergency and after-hours nurse availability</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <button
          onClick={() => setCreateOpen(true)}
          className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add On-Call
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          >
            <option>All</option>
            <option>Active</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Department</label>
          <input
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            placeholder="Filter department"
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
        </div>
      </div>

      {/* Alert Banner */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#e8a0a0]/10 to-[#d88080]/5 border border-[#e8a0a0]/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#e8a0a0] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Emergency Contact Protocol</p>
            <p className="text-xs text-muted-foreground">
              Always contact primary on-call first. If unavailable within 5 minutes, contact backup immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Current On-Call */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-[#6b9bd1]/10 to-[#5a8bc1]/5 border-2 border-[#6b9bd1]/30">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#6b9bd1]" />
          <h3 className="text-base font-medium text-foreground">Currently On-Call Nurses</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {onCallSchedule.slice(0, 2).map((schedule) => (
            <div key={schedule.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getDepartmentColor(schedule.department)}`}>
                  {schedule.department}
                </span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getShiftColor(schedule.shift)}`}>
                  {schedule.shift}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Primary</p>
                  <p className="text-sm font-medium text-foreground">{schedule.primary}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Backup</p>
                  <p className="text-sm text-foreground">{schedule.backup}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Schedule */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-r from-[#faf8f5] to-[#f5f0ea]">
          <h3 className="text-sm font-medium text-foreground">On-Call Schedule</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Week of March 30 - April 5, 2026</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Department</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Shift</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Primary Nurse</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Backup</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Contact</th>
              </tr>
            </thead>
            <tbody>
              {onCallSchedule.map((schedule) => (
                <tr key={schedule.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{schedule.day}</p>
                      <p className="text-xs text-muted-foreground">{schedule.date}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getDepartmentColor(schedule.department)}`}>
                      {schedule.department}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getShiftColor(schedule.shift)}`}>
                      {schedule.shift}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{schedule.primary}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{schedule.backup}</td>
                  <td className="py-4 px-4">
                    <div className="ml-auto flex items-center gap-2 w-fit">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-border text-xs"
                        onClick={() => void openEditDepartmentModal(schedule.id)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editOnCallId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit On-Call</h3>
            <form onSubmit={handleSubmit(saveOnCall)}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                  <select
                    {...register("siteId", { valueAsNumber: true, min: 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                  >
                    {sites.map((s) => (
                      <option key={s.siteId} value={s.siteId}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                  <input type="date" min={today} {...register("date", { required: true })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
                </div>
              </div>
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Department</label>
              <input
                type="text"
                {...register("department", {
                  required: "Department is required.",
                  minLength: { value: 2, message: "Department must be at least 2 characters." },
                  maxLength: { value: 50, message: "Department must be at most 50 characters." },
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.department && <p className="text-xs text-destructive mt-1">{errors.department.message}</p>}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" {...register("startTime", { required: "Start time is required." })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
                  {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input
                    type="time"
                    {...register("endTime", {
                      required: "End time is required.",
                      validate: (value) => value > watchedStartTime || "End time must be greater than start time.",
                    })}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
                  />
                  {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Primary Nurse</label>
                  <select {...register("primaryUserId", { valueAsNumber: true, min: 1 })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                    {nurseOptions
                      .filter((u) => u.userId !== selectedPrimaryInForm)
                      .map((u) => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Backup Nurse</label>
                  <select {...register("backupUserId", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                    <option value="">None</option>
                    {nurseOptions
                      .filter((u) => u.userId !== selectedPrimaryInForm)
                      .map((u) => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select {...register("status")} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                  <option value="Active">Active</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditDepartmentModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit(saveOnCall)()}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {createOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Create On-Call</h3>
            <form onSubmit={handleSubmit(createOnCallRecord)}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                  <select {...register("siteId", { valueAsNumber: true, min: 1 })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                    {sites.map((s) => (
                      <option key={s.siteId} value={s.siteId}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                  <input type="date" min={today} {...register("date", { required: true })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
                </div>
              </div>
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Department</label>
              <input type="text" {...register("department", { required: true })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" {...register("startTime", { required: true })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input type="time" {...register("endTime", { required: true })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Primary Nurse</label>
                  <select {...register("primaryUserId", { valueAsNumber: true, min: 1 })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                    <option value={0}>Select nurse</option>
                    {nurseOptions.map((u) => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Backup Nurse</label>
                  <select {...register("backupUserId", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm">
                    <option value="">None</option>
                    {nurseOptions.map((u) => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">
                Cancel
              </button>
              <button onClick={() => void handleSubmit(createOnCallRecord)()} disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60">
                {isSubmitting ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
