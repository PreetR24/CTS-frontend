import { useEffect, useState } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";
import {
  activateHoliday,
  createHoliday,
  deactivateHoliday,
  getHolidayByDate,
  getHolidayById,
  searchHolidays,
  type HolidayDto,
  updateHoliday,
} from "../../../api/holidaysApi";
import { fetchSites, type SiteDto } from "../../../api/masterdataApi";

export default function AdminHolidays() {
  const [showModal, setShowModal] = useState(false);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editHolidayId, setEditHolidayId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [form, setForm] = useState({
    description: "",
    date: "",
    siteId: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [holidayList, siteList] = await Promise.all([
          searchHolidays({ page: 1, pageSize: 200 }),
          fetchSites({ page: 1, pageSize: 200 }),
        ]);
        if (cancelled) return;
        setHolidays(holidayList);
        setSites(siteList);
        setForm((prev) => ({ ...prev, siteId: siteList[0]?.siteId ?? 0 }));
      } catch {
        if (!cancelled) {
          setHolidays([]);
          setSites([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const holidayRows = holidays.map((h) => ({
    id: h.holidayId,
    date: h.date,
    name: h.description || "Holiday",
    siteId: h.siteId,
    site: sites.find((s) => s.siteId === h.siteId)?.name ?? "Unknown Site",
  }));

  const handleCreate = async () => {
    if (!form.date || !form.siteId) return;
    setIsSaving(true);
    try {
      const created = await createHoliday({
        siteId: form.siteId,
        date: form.date,
        description: form.description || undefined,
      });
      setHolidays((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({
        description: "",
        date: "",
        siteId: sites[0]?.siteId ?? form.siteId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deactivateHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.holidayId !== id));
    } catch {
      // preserve existing row when request fails
    }
  };

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => setShowModal(false);

  const startEditHoliday = async (holidayId: number) => {
    const detail = await getHolidayById(holidayId);
    setEditHolidayId(holidayId);
    setEditDescription(detail.description ?? "Holiday");
  };

  const activateHolidayRow = async (holidayId: number) => {
    await activateHoliday(holidayId);
    const refreshed = await searchHolidays({ page: 1, pageSize: 200 });
    setHolidays(refreshed);
  };

  const closeEditHolidayModal = () => setEditHolidayId(null);

  const saveEditedHoliday = async () => {
    if (editHolidayId == null) return;
    const updated = await updateHoliday(editHolidayId, { description: editDescription });
    setHolidays((prev) => prev.map((h) => (h.holidayId === editHolidayId ? updated : h)));
    setEditHolidayId(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Holidays</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage site-specific non-working days</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Slot generation will skip these dates</p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidayRows.map((holiday) => (
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
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{holiday.site}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => void startEditHoliday(holiday.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => void activateHolidayRow(holiday.id)}
                  >
                    Activate
                  </button>
                </div>
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
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={async (e) => {
                    const date = e.target.value;
                    setForm((prev) => ({ ...prev, date }));
                    if (form.siteId && date) {
                      try {
                        const existing = await getHolidayByDate(form.siteId, date);
                        if (existing) {
                          setNotice(`Holiday already exists: ${existing.description ?? existing.date}`);
                        }
                      } catch {
                        // ignore if none
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Apply To</label>
                <select
                  value={form.siteId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, siteId: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                {isSaving ? "Adding..." : "Add Holiday"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editHolidayId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Holiday</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Holiday Name</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditHolidayModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveEditedHoliday()}
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
