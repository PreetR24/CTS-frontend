import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import {
  activateHoliday,
  createHoliday,
  deactivateHoliday,
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
  const [filterSiteId, setFilterSiteId] = useState(0);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [editHolidayId, setEditHolidayId] = useState<number | null>(null);
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    getValues: getCreateValues,
    formState: { errors: createErrors },
  } = useForm<{ description: string; date: string; siteId: number }>({
    defaultValues: { description: "", date: "", siteId: -1 },
  });
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<{ description: string; date: string; siteId: number }>({
    defaultValues: { description: "", date: "", siteId: 0 },
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
        resetCreateForm({ description: "", date: "", siteId: -1 });
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

  const holidayRows = useMemo(
    () =>
      holidays
        .filter((h) => filterStatus === "All" || h.status === filterStatus)
        .filter((h) => filterSiteId === 0 || h.siteId === filterSiteId)
        .filter((h) => (filterMonth ? h.date.startsWith(filterMonth) : true))
        .map((h) => ({
          id: h.holidayId,
          date: h.date,
          name: h.description || "Holiday",
          siteId: h.siteId,
          site: sites.find((s) => s.siteId === h.siteId)?.name ?? "Unknown Site",
          status: h.status,
        })),
    [holidays, filterStatus, filterSiteId, filterMonth, sites]
  );

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const handleCreate = async (values: { description: string; date: string; siteId: number }) => {
    if (!values.date || !values.siteId) return;
    setIsSaving(true);
    try {
      setNotice(null);
      const targetSiteIds = values.siteId === -1 ? sites.map((site) => site.siteId) : [values.siteId];
      const duplicateSiteIds = targetSiteIds.filter((siteId) =>
        holidays.some(
          (h) =>
            h.siteId === siteId &&
            h.date === values.date &&
            h.status !== "Inactive"
        )
      );
      if (duplicateSiteIds.length > 0) {
        const duplicateNames = sites
          .filter((s) => duplicateSiteIds.includes(s.siteId))
          .map((s) => s.name)
          .join(", ");
        setNotice(
          duplicateNames
            ? `Holiday already exists for ${values.date} at: ${duplicateNames}.`
            : `Holiday already exists for ${values.date} on selected site.`
        );
        return;
      }
      const createdRows = await Promise.all(
        targetSiteIds.map((siteId) =>
          createHoliday({
            siteId,
            date: values.date,
            description: values.description || undefined,
          })
        )
      );
      setHolidays((prev) => [...createdRows, ...prev]);
      setShowModal(false);
      resetCreateForm({ description: "", date: "", siteId: -1 });
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not create holiday."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setNotice(null);
      await deactivateHoliday(id);
      setHolidays((prev) => prev.map((h) => (h.holidayId === id ? { ...h, status: "Inactive" } : h)));
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not deactivate holiday."));
    }
  };

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => {
    setShowModal(false);
    resetCreateForm({ description: "", date: "", siteId: -1 });
  };

  const startEditHoliday = async (holidayId: number) => {
    try {
      setNotice(null);
      const detail = await getHolidayById(holidayId);
      setEditHolidayId(holidayId);
      resetEditForm({
        description: detail.description ?? "Holiday",
        date: detail.date,
        siteId: detail.siteId,
      });
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not load holiday details."));
    }
  };

  const activateHolidayRow = async (holidayId: number) => {
    try {
      setNotice(null);
      await activateHoliday(holidayId);
      const refreshed = await searchHolidays({ page: 1, pageSize: 200 });
      setHolidays(refreshed);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not activate holiday."));
    }
  };

  const closeEditHolidayModal = () => setEditHolidayId(null);

  const saveEditedHoliday = async (values: { description: string; date: string; siteId: number }) => {
    if (editHolidayId == null) return;
    try {
      setNotice(null);
      const updated = await updateHoliday(editHolidayId, {
        description: values.description,
        date: values.date,
        siteId: values.siteId,
      });
      setHolidays((prev) => prev.map((h) => (h.holidayId === editHolidayId ? updated : h)));
      setEditHolidayId(null);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not update holiday."));
    }
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
        <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
          >
            <option value={0}>All sites</option>
            {sites.map((site) => (
              <option key={site.siteId} value={site.siteId}>
                {site.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>All</option>
          </select>
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
                  <span className="text-xs text-muted-foreground">#{holiday.id}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{holiday.site}</p>
                <p className="text-xs text-muted-foreground mt-1">Status: {holiday.status}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-border rounded"
                    onClick={() => void startEditHoliday(holiday.id)}
                  >
                    Edit
                  </button>
                  {holiday.status === "Active" ? (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded text-destructive"
                      onClick={() => void handleDelete(holiday.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 text-xs border border-border rounded"
                      onClick={() => void activateHolidayRow(holiday.id)}
                    >
                      Activate
                    </button>
                  )}
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
            <form className="space-y-4" onSubmit={handleCreateSubmit(handleCreate)}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g., Diwali"
                  {...registerCreate("description", {
                    required: "Holiday name is required.",
                    validate: (value) => value.trim().length > 0 || "Holiday name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.description && <p className="text-xs text-destructive mt-1">{createErrors.description.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  {...registerCreate("date", {
                    required: "Date is required.",
                  })}
                  onChange={(e) => {
                    const date = e.target.value;
                    const selectedSiteId = Number(getCreateValues("siteId"));
                    if (date && selectedSiteId > 0) {
                      const exists = holidays.some(
                        (h) =>
                          h.siteId === selectedSiteId &&
                          h.date === date &&
                          h.status !== "Inactive"
                      );
                      if (exists) {
                        const siteName = sites.find((s) => s.siteId === selectedSiteId)?.name ?? `Site ${selectedSiteId}`;
                        setNotice(`Holiday already exists for ${date} at ${siteName}.`);
                      } else {
                        setNotice(null);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {createErrors.date && <p className="text-xs text-destructive mt-1">{createErrors.date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Apply To</label>
                <select
                  {...registerCreate("siteId", {
                    valueAsNumber: true,
                    validate: (value) =>
                      value === -1 || value > 0 || "Select a valid site.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={-1}>All sites</option>
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
                {createErrors.siteId && <p className="text-xs text-destructive mt-1">{createErrors.siteId.message}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  {isSaving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editHolidayId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Holiday</h3>
            <form onSubmit={handleEditSubmit(saveEditedHoliday)}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Holiday Name</label>
              <input
                type="text"
                {...registerEdit("description", {
                  required: "Holiday name is required.",
                  validate: (value) => value.trim().length > 0 || "Holiday name cannot be empty.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.description && <p className="text-xs text-destructive mt-1">{editErrors.description.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Date</label>
              <input
                type="date"
                {...registerEdit("date", {
                  required: "Date is required.",
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {editErrors.date && <p className="text-xs text-destructive mt-1">{editErrors.date.message}</p>}
              <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Site</label>
              <select
                {...registerEdit("siteId", {
                  valueAsNumber: true,
                  min: { value: 1, message: "Select a valid site." },
                })}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
              {editErrors.siteId && <p className="text-xs text-destructive mt-1">{editErrors.siteId.message}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditHolidayModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
