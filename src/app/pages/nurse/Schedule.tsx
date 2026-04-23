
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { meApi } from "../../../api/authApi";
import {
  getShiftTemplateById,
  searchRosterAssignments,
  type RosterAssignmentDto,
  type ShiftTemplateDto,
} from "../../../api/operationsApi";

type ShiftRow = {
  id: number;
  date: string;
  shiftTemplate: string;
  role: string;
  status: string;
};

export default function NurseSchedule() {
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notice, setNotice] = useState<string | null>(null);

  const refreshSchedule = async (selectedDate?: string) => {
    try {
      setNotice(null);
      const me = await meApi();
      const assignments = await searchRosterAssignments({
        userId: me.userId,
        date: selectedDate || undefined,
      });
      const templateIds = Array.from(new Set(assignments.map((a) => a.shiftTemplateId)));
      const templateEntries = await Promise.all(
        templateIds.map(async (id) => {
          try {
            const template = await getShiftTemplateById(id);
            return [id, template] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      const templates = new Map<number, ShiftTemplateDto | null>(templateEntries);
      const mapped: ShiftRow[] = assignments.map((a: RosterAssignmentDto) => {
        const template = templates.get(a.shiftTemplateId);
        return {
          id: a.assignmentId,
          date: a.date,
          shiftTemplate: template
            ? `${template.name} (${template.startTime} - ${template.endTime})`
            : `Shift Template #${a.shiftTemplateId}`,
          role: a.role ?? "Nurse",
          status: a.status,
        };
      });
      setRows(mapped);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setNotice(msg ?? "Could not load roster-assigned schedule.");
      setRows([]);
    }
  };

  useEffect(() => {
    void refreshSchedule(date || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Roster-assigned nurse schedule</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Filter by Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Shift Template</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-sm text-muted-foreground">
                    No roster assignments found.
                  </td>
                </tr>
              )}
              {sortedRows.map((shift) => (
                <tr key={shift.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-foreground">{shift.date}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{shift.shiftTemplate}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{shift.role}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-[#a9d4b8]/30 text-xs font-medium text-foreground">{shift.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
