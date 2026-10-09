import { useState, useEffect, useCallback, useRef } from "react";
import api from "../data/axiosConfig";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { Pill } from "./ui/Primitives";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3.5" style={{ width: `${60 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isSent = status === "sent";
  return (
    <Pill tone={isSent ? "emerald" : "rose"} dot={isSent ? "bg-emerald-500" : "bg-rose-500"}>
      {isSent ? "Sent" : "Failed"}
    </Pill>
  );
}

// ── Email Log Detail Modal ────────────────────────────────────────────────────
function LogDetailModal({ logId, onClose }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/email/history/${logId}`)
      .then((r) => setLog(r.data.data))
      .catch(() => setLog(null))
      .finally(() => setLoading(false));
  }, [logId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl surface-card shadow-elevated overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Email Details</h2>
          </div>
          <button onClick={onClose} className="icon-btn w-7 h-7">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              Loading…
            </div>
          ) : !log ? (
            <p className="text-center text-slate-400 py-8">Could not load log details.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "To", value: log.to },
                  { label: "Campaign", value: log.campaignId || "—" },
                  { label: "Status", value: <StatusBadge status={log.status} /> },
                  { label: "Sent At", value: fmtDate(log.sentAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                    <div className="text-[13px] font-medium text-slate-900 dark:text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-[13px] font-medium text-slate-900 dark:text-white">{log.subject}</p>
              </div>
              {log.errorMessage && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1">Error</p>
                  <p className="text-[12px] text-rose-600 dark:text-rose-400">{log.errorMessage}</p>
                </div>
              )}
              {log.body && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Email Body</p>
                  <div
                    className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-[#0B0715] text-[13px] text-slate-900 dark:text-white max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(log.body) }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main EmailHistory component ───────────────────────────────────────────────
export default function EmailHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [campaigns, setCampaigns] = useState([]);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Fetch campaign list for dropdown ─────────────────────────────────────────
  useEffect(() => {
    api.get("/email/history/campaigns")
      .then((r) => setCampaigns(r.data.data || []))
      .catch(() => {});
  }, []);

  // ── Fetch logs ────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 1, searchVal = search, campaign = campaignFilter, sort = sortOrder, from = dateFrom, to = dateTo) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        search: searchVal,
        campaignId: campaign,
        sortOrder: sort,
      });
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const res = await api.get(`/email/history?${params}`);
      setLogs(res.data.data || []);
      setPagination((p) => ({ ...p, ...res.data.pagination, page }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load email history");
    } finally {
      setLoading(false);
    }
  }, [search, campaignFilter, sortOrder, dateFrom, dateTo, pagination.limit]);

  useEffect(() => { fetchLogs(1); }, []);

  // ── Search debounce ────────────────────────────────────────────────────────
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLogs(1, val, campaignFilter, sortOrder), 400);
  };

  const handleCampaignChange = (val) => {
    setCampaignFilter(val);
    fetchLogs(1, search, val, sortOrder);
  };

  const handleSortChange = (val) => {
    setSortOrder(val);
    fetchLogs(1, search, campaignFilter, val, dateFrom, dateTo);
  };

  const handleDateFromChange = (val) => {
    setDateFrom(val);
    fetchLogs(1, search, campaignFilter, sortOrder, val, dateTo);
  };

  const handleDateToChange = (val) => {
    setDateTo(val);
    fetchLogs(1, search, campaignFilter, sortOrder, dateFrom, val);
  };

  const handleClearDates = () => {
    setDateFrom("");
    setDateTo("");
    fetchLogs(1, search, campaignFilter, sortOrder, "", "");
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this log entry?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/email/history/${id}`);
      fetchLogs(pagination.page);
    } catch {
      alert("Failed to delete log");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      // Fetch all records for export (limit 5000)
      const params = new URLSearchParams({
        page: 1,
        limit: 5000,
        search,
        campaignId: campaignFilter,
        sortOrder,
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await api.get(`/email/history?${params}`);
      const data = res.data.data || [];

      if (data.length === 0) { alert("No records to export"); return; }

      const headers = ["Recipient", "Subject", "Campaign", "Status", "Sent At", "Error"];
      const rows = data.map((l) => [
        `"${l.to}"`,
        `"${l.subject.replace(/"/g, '""')}"`,
        `"${l.campaignId || ""}"`,
        l.status,
        fmtDate(l.sentAt),
        `"${l.errorMessage || ""}"`,
      ]);

      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `email-history-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="ld-canvas min-h-screen font-poppins px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 dark:text-white">Email Source History</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {loading ? "Loading…" : `${pagination.total.toLocaleString()} total emails logged`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="icon-btn w-9 h-9"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="btn-primary btn-md"
          >
            {exportLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            )}
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: "Total (this page)", value: logs.length, dot: "bg-indigo-500" },
          { label: "Sent", value: sentCount, dot: "bg-emerald-500" },
          { label: "Failed", value: failedCount, dot: "bg-rose-500" },
          { label: "All time", value: pagination.total, dot: "bg-violet-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 surface-card px-4 py-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            <span className="text-[13px] font-bold text-slate-900 dark:text-white">{s.value.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by recipient email…"
            className="input-field pl-8 pr-4 py-2.5"
          />
          {search && (
            <button onClick={() => handleSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Campaign filter */}
        <select
          value={campaignFilter}
          onChange={(e) => handleCampaignChange(e.target.value)}
          className="input-field px-3 py-2.5 w-auto"
        >
          <option value="">All Source</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Date From */}
        <div className="relative flex items-center">
          <svg className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="input-field pl-8 pr-3 py-2.5 w-[150px]"
            title="From date"
          />
        </div>

        <span className="text-[12px] text-slate-400 shrink-0">to</span>

        {/* Date To */}
        <div className="relative flex items-center">
          <svg className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="input-field pl-8 pr-3 py-2.5 w-[150px]"
            title="To date"
          />
        </div>

        {/* Clear dates button */}
        {(dateFrom || dateTo) && (
          <button
            onClick={handleClearDates}
            className="btn-secondary btn-sm hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30"
            title="Clear date filter"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Clear dates
          </button>
        )}

        {/* Sort */}
        <select
          value={sortOrder}
          onChange={(e) => handleSortChange(e.target.value)}
          className="input-field px-3 py-2.5 w-auto"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-4 py-3 text-[12px] text-rose-600 dark:text-rose-400 mb-4">
           {error}
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
                {["Recipient", "Campaign Name", "Source", "Status", "Sent At", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="text-[36px] mb-3"></div>
                    <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">No email logs found</p>
                    <p className="text-[12px] text-slate-400 mt-1">
                      {search || campaignFilter || dateFrom || dateTo ? "Try clearing your filters." : "Send emails to start tracking history."}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => setSelectedLogId(log._id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
                          {log.to?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-[12px] font-medium text-slate-900 dark:text-white max-w-[180px] truncate">{log.to}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-slate-600 dark:text-slate-300 max-w-[200px] truncate block">{log.subject}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.campaignId ? (
                        <span className="badge bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 max-w-[140px] truncate">
                          {log.campaignId}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-slate-400 whitespace-nowrap">{fmtDate(log.sentAt)}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(log._id)}
                        disabled={deletingId === log._id}
                        className="icon-btn w-7 h-7 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40"
                        title="Delete log"
                      >
                        {deletingId === log._id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <span className="text-[12px] text-slate-400">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="btn-secondary btn-sm"
              >
                ← Prev
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                const p = start + i;
                if (p > pagination.totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => fetchLogs(p)}
                    className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition ${
                      p === pagination.page
                        ? "bg-brand-gradient text-white shadow-glow-brand"
                        : "border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedLogId && (
        <LogDetailModal logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
      )}
    </div>
  );
}