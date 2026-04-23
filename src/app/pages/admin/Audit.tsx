import { useEffect, useMemo, useState } from "react";
import { searchAuditLogs, type AuditLogDto } from "../../../api/adminGovernanceApi";
import { isAxiosError } from "axios";

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [textSearch, setTextSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const data = await searchAuditLogs({
        page,
        pageSize,
      });
      setRows(data);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setRows([]);
      setLoadError(msg ?? "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, [page, pageSize]);

  const filteredRows = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.resource.toLowerCase().includes(q) ||
        (r.metadata ?? "").toLowerCase().includes(q) ||
        String(r.auditId).includes(q) ||
        String(r.userId ?? "").includes(q) ||
        (r.userName ?? "").toLowerCase().includes(q)
    );
  }, [rows, textSearch]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Master search with live filtering on each typed letter</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            value={textSearch}
            onChange={(e) => setTextSearch(e.target.value)}
            placeholder="Master search (user name/action/resource/metadata/auditId)"
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-lg border border-border text-sm"
            >
              Prev
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded-lg border border-border text-sm"
            >
              Next
            </button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Audit ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">User Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Action</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Resource</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Timestamp</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-sm text-muted-foreground text-center">Loading...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-sm text-muted-foreground text-center">No audit logs found.</td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.auditId} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 text-sm text-foreground">{r.auditId}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.userName ?? "-"}</td>
                  <td className="py-3 px-4 text-sm text-foreground">{r.action}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.resource}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.timestamp}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.metadata ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
