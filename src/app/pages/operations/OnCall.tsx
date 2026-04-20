import { useEffect, useState } from "react";
import { Phone, AlertCircle, Clock } from "lucide-react";
import { getOnCallById, searchOnCall, updateOnCall } from "../../../api/operationsApi";
import { fetchUsers, type UserDto } from "../../../api/usersApi";

type OnCallRow = {
  id: number;
  date: string;
  day: string;
  department: string;
  primary: string;
  backup: string;
  contact: string;
  shift: string;
};

export default function OperationsOnCall() {
  const [rows, setRows] = useState<OnCallRow[]>([]);
  const [editOnCallId, setEditOnCallId] = useState<number | null>(null);
  const [editDepartment, setEditDepartment] = useState("General");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onCalls, users] = await Promise.all([
          searchOnCall(),
          fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[]),
        ]);
        if (cancelled) return;
        const names = new Map(users.map((u) => [u.userId, u.name]));
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

  const onCallSchedule = rows;

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

  const openEditDepartmentModal = async (onCallId: number) => {
    const detail = await getOnCallById(onCallId);
    setEditOnCallId(onCallId);
    setEditDepartment(detail.department ?? "General");
  };

  const closeEditDepartmentModal = () => setEditOnCallId(null);

  const saveEditedDepartment = async () => {
    if (editOnCallId == null || !editDepartment.trim()) return;
    await updateOnCall(editOnCallId, { department: editDepartment.trim() });
    const list = await searchOnCall();
    const names = new Map(
      (await fetchUsers({ page: 1, pageSize: 500 }).catch(() => [] as UserDto[])).map((u) => [
        u.userId,
        u.name,
      ])
    );
    setRows(
      list.map((o) => ({
        id: o.onCallId,
        date: o.date,
        day: new Date(`${o.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
        department: o.department ?? "General",
        primary: names.get(o.primaryUserId) ?? "Team Member",
        backup: o.backupUserId ? names.get(o.backupUserId) ?? "Team Member" : "—",
        contact: "+91 00000 00000",
        shift: `${o.startTime}-${o.endTime}`,
      }))
    );
    setEditOnCallId(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">On-Call Coverage</h1>
        <p className="text-sm text-muted-foreground mt-1">Emergency and after-hours staff availability</p>
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
          <h3 className="text-base font-medium text-foreground">Currently On-Call</h3>
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
              <a 
                href={`tel:${schedule.contact}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
              >
                <Phone className="w-4 h-4" />
                Call {schedule.contact}
              </a>
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
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Primary On-Call</th>
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
                      <a 
                        href={`tel:${schedule.contact}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#6b9bd1] text-white text-xs font-medium hover:shadow-md transition-all w-fit"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
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
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Department</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Department</label>
            <input
              type="text"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditDepartmentModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button onClick={() => void saveEditedDepartment()} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
