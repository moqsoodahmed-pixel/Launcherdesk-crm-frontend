import { useState, useEffect, useCallback } from "react";
import api from "../data/axiosConfig";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Pill, Avatar } from "./ui/Primitives";

function fmt(mins) {
  if (!mins) return "0h 00m";
  return `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, "0")}m`;
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE = {
  active:        { tone: "emerald", dot: "bg-emerald-500",          label: "Active" },
  on_break:      { tone: "amber",   dot: "bg-amber-500",            label: "On Break" },
  idle:          { tone: "rose",    dot: "bg-rose-500 animate-pulse", label: "Idle" },
  logged_out:    { tone: "slate",   dot: "bg-slate-400",            label: "Logged Out" },
  not_logged_in: { tone: "slate",   dot: "bg-slate-300",            label: "Not In" },
};

/**
 * Compute live break minutes on the client side as a fallback.
 * If the backend provides `liveBreakMinutes`, that takes priority.
 * Otherwise, sum all completed breaks + add the ongoing break duration
 * if the employee is currently on_break and the last break has no endTime.
 */
function getLiveBreakMinutes(rec) {
  // Prefer backend-provided live value
  if (rec.liveBreakMinutes != null) return rec.liveBreakMinutes;

  const breaks = rec.breaks || [];
  const now = Date.now();

  const total = breaks.reduce((sum, b) => {
    const start = b.startTime ? new Date(b.startTime).getTime() : null;
    if (!start) return sum;
    // If break has no end time and status is on_break, treat it as ongoing
    const end = b.endTime ? new Date(b.endTime).getTime() : (rec.status === "on_break" ? now : null);
    if (!end) return sum;
    return sum + Math.max(0, (end - start) / 60000);
  }, 0);

  return Math.round(total);
}

export default function AdminAttendanceView() {
  const [records, setRecords] = useState([]);
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  // ── Company shift window (read-only) ────────────────────────────────────
  // Replaces the old per-employee "Ideal Time" free-text field — see the
  // matching change in AttendanceTable.jsx for why.
  const [shiftCfg, setShiftCfg] = useState(null);
  useEffect(() => {
    api.get("/admin/company/attendance-config").then(r => setShiftCfg(r.data)).catch(() => {});
  }, []);
  const fmtShift = (h, m) => {
    if (h == null) return "—";
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
  };
  const shiftLabel = shiftCfg
    ? `${fmtShift(shiftCfg.shiftStartHour, shiftCfg.shiftStartMinute)} – ${fmtShift(shiftCfg.shiftEndHour, shiftCfg.shiftEndMinute)}`
    : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/company?date=${date}`);
      setRecords(res.data || []);
    } catch {}
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const summary = {
    active:    records.filter(r => r.status === "active").length,
    on_break:  records.filter(r => r.status === "on_break").length,
    idle:      records.filter(r => r.status === "idle").length,
    logged_out:records.filter(r => r.status === "logged_out").length,
    not_in:    records.filter(r => r.status === "not_logged_in").length,
  };

  return (
    <div className="surface-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Team Attendance</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">Auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} max={new Date().toISOString().slice(0,10)}
            onChange={e => setDate(e.target.value)}
            aria-label="Select attendance date"
            className="input-field w-auto px-3 py-1.5 text-[12px]" />
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-sm btn-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {shiftLabel && (
        <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mb-4">
          Company shift hours: {shiftLabel}
        </p>
      )}

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[["Active", summary.active, "emerald"], ["On Break", summary.on_break, "amber"], ["Idle", summary.idle, "rose"], ["Logged Out", summary.logged_out, "slate"], ["Not In", summary.not_in, "slate"]].map(([label, count, tone]) => (
          <Pill key={label} tone={tone}>{label}: {count}</Pill>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 skeleton" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500 dark:text-slate-500">
          <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          <p className="text-[13px]">No attendance records for this date.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {records.map((rec, i) => {
            const st = STATUS_STYLE[rec.status] || STATUS_STYLE["not_logged_in"];
            // FIX: use live work minutes with fallback, and live break minutes with fallback
            const workMins  = rec.liveWorkMinutes  ?? rec.totalWorkMinutes;
            const breakMins = getLiveBreakMinutes(rec);
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                {/* Avatar */}
                <Avatar name={rec.user?.name} size={9} />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{rec.user?.name || "Unknown"}</p>
                    <Pill tone={st.tone} dot={st.dot} className="!text-[10px]">{st.label}</Pill>
                    {rec.status === "idle" && (
                      <Pill tone="rose" icon={AlertTriangle} className="!text-[10px]">IDLE</Pill>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[10px] text-slate-500 dark:text-slate-500 flex-wrap">
                    <span>In: {fmtTime(rec.loginTime)}</span>
                    {rec.logoutTime && <span>Out: {fmtTime(rec.logoutTime)}</span>}
                    <span>Work: {fmt(workMins)}</span>
                    {/* FIX: now uses getLiveBreakMinutes which accounts for ongoing breaks */}
                    <span>Breaks: {fmt(breakMins)}</span>
                    {rec.breaks?.length > 0 && <span>{rec.breaks.length} break{rec.breaks.length > 1 ? "s" : ""}</span>}
                  </div>
                  {/* Idle remarks — pending count badge + most recent filled one */}
                  {(() => {
                    const idleBreaks = (rec.breaks || []).filter(b => b.reason === "Auto Idle");
                    if (idleBreaks.length === 0) return null;
                    const pendingCount = idleBreaks.filter(b => b.remarkStatus === "pending").length;
                    const lastFilled   = [...idleBreaks].reverse().find(b => b.remarkStatus === "filled");
                    return (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] flex-wrap">
                        {pendingCount > 0 && (
                          <Pill tone="amber" icon={AlertTriangle} className="!text-[10px]">
                            {pendingCount} idle remark{pendingCount > 1 ? "s" : ""} pending
                          </Pill>
                        )}
                        {lastFilled && (
                          <span className="text-slate-500 dark:text-slate-500 italic truncate max-w-[160px]" title={lastFilled.remark}>
                            "{lastFilled.remark}"
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
