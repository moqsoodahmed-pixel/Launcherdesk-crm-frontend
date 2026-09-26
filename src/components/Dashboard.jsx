import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Users, CheckCircle, BarChart2, Clock, Building2, Eye,
  RefreshCw, AlertTriangle, X, Search, ChevronRight,
  Flame, Thermometer, Snowflake, TrendingUp, TrendingDown,
  Activity, Zap, ArrowUpRight, Mail, Sparkles, Calendar,
} from "lucide-react";
import api from "../data/axiosConfig";
import { fetchAll, getRole, getStoredUser } from "../data/dataService";
import UserManagement from "./UserMangement";
import AdminChat from "./Adminchat";
import LeadTimeline from "./LeadTimeLine";
import AdminAttendanceView from "./AdminAttendanceView";
import CompanyBrandSettings from "./CompanyBrandSettings";
import SuperAdminFilter from "./SuperAdminFilter";
import useEntitlements from "../hooks/useEntitlements";

// ── Phone masking helper ──────────────────────────────────────────────────────
function maskPhone(phone) {
  if (!phone) return "—";
  const str = String(phone).replace(/\s/g, "");
  if (str.length <= 4) return "••••";
  return str.slice(0, 2) + "•".repeat(Math.max(str.length - 4, 3)) + str.slice(-2);
}

// ── Email masking helper ──────────────────────────────────────────────────────
function maskEmail(email) {
  if (!email) return "—";
  const str = String(email).trim();
  const atIdx = str.indexOf("@");
  if (atIdx <= 0) return "••••@••••";
  const local = str.slice(0, atIdx);
  const domain = str.slice(atIdx + 1);
  const maskedLocal = local.length <= 2 ? "•".repeat(local.length) : local[0] + "•".repeat(Math.max(local.length - 2, 2)) + local[local.length - 1];
  const dotIdx = domain.lastIndexOf(".");
  const maskedDomain = dotIdx > 0 ? "••" + domain.slice(dotIdx) : "••";
  return `${maskedLocal}@${maskedDomain}`;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  const match = dateStr.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
  if (match) {
    const months = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const [, day, mon, yr] = match;
    return new Date(Number(yr), months[mon], parseInt(day, 10), 12);
  }
  return new Date(dateStr);
}

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getRangeWindow(range) {
  const now = new Date();
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week": {
      const s = startOfDay(new Date());
      s.setDate(s.getDate() - 6);
      return { start: s, end: endOfDay(now) };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { start: new Date(now.getFullYear(), q * 3, 1), end: endOfDay(now) };
    }
    default:
      return null;
  }
}

function filterByRange(leads, range) {
  const win = getRangeWindow(range);
  if (!win) return leads;
  return leads.filter((l) => {
    const d = parseDate(l.date);
    return d >= win.start && d <= win.end;
  });
}

function buildChartBuckets(leads, range) {
  const now = new Date();
  if (range === "today") {
    const hours = Array.from({ length: 8 }, (_, i) => 9 + i);
    return {
      labels: hours.map((h) => `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`),
      new: hours.map((h) => leads.filter((l) => parseDate(l.date).getHours() === h).length),
      conv: hours.map((h) => leads.filter((l) => l.status === "Converted" && parseDate(l.date).getHours() === h).length),
    };
  }
  if (range === "week") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      labels: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i); return days[d.getDay()];
      }),
      new: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i);
        return leads.filter((l) => parseDate(l.date).toDateString() === d.toDateString()).length;
      }),
      conv: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i);
        return leads.filter((l) => l.status === "Converted" && parseDate(l.date).toDateString() === d.toDateString()).length;
      }),
    };
  }
  if (range === "month") {
    return {
      labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
      new: [1, 2, 3, 4].map((w) => leads.filter((l) => Math.ceil(parseDate(l.date).getDate() / 7) === w).length),
      conv: [1, 2, 3, 4].map((w) => leads.filter((l) => l.status === "Converted" && Math.ceil(parseDate(l.date).getDate() / 7) === w).length),
    };
  }
  const q = Math.floor(now.getMonth() / 3);
  const months = [q * 3, q * 3 + 1, q * 3 + 2];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    labels: months.map((m) => MON[m]),
    new: months.map((m) => leads.filter((l) => parseDate(l.date).getMonth() === m).length),
    conv: months.map((m) => leads.filter((l) => l.status === "Converted" && parseDate(l.date).getMonth() === m).length),
  };
}

// ── Chart.js loader ───────────────────────────────────────────────────────────
function useChartJS() {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function isDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// ── LineChart ─────────────────────────────────────────────────────────────────
function LineChart({ data1, data2, labels }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    const dark = isDarkMode();
    const textColor = dark ? "#8B93A7" : "#64748B";
    const gridColor = dark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.045)";
    const bgColor = dark ? "#141A28" : "#ffffff";

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    chartRef.current = new window.Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "New leads",
            data: data1,
            borderColor: "#4F46E5",
            backgroundColor: "rgba(79,70,229,0.10)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#4F46E5",
            pointBorderColor: bgColor,
            pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: "Converted",
            data: data2,
            borderColor: "#10B981",
            backgroundColor: "rgba(16,185,129,0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#10B981",
            pointBorderColor: bgColor,
            pointBorderWidth: 2,
            borderWidth: 2.5,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? "#141A28" : "#ffffff",
            titleColor: dark ? "#FFFFFF" : "#0F172A",
            bodyColor: dark ? "#9A8DB6" : "#64748B",
            borderColor: dark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            titleFont: { size: 12, weight: "600" },
            bodyFont: { size: 12 },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textColor, font: { size: 11 }, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              color: textColor,
              font: { size: 11 },
              stepSize: 1,
              callback: (v) => (Number.isInteger(v) ? v : ""),
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data.labels = labels;
    chartRef.current.data.datasets[0].data = data1;
    chartRef.current.data.datasets[1].data = data2;
    chartRef.current.update();
  }, [data1, data2, labels]);

  return (
    <div style={{ position: "relative", width: "100%", height: 200 }}>
      <canvas ref={canvasRef} role="img" aria-label="Line chart of new and converted leads over time" />
    </div>
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ segments }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const values = segments.map((s) => s.value);
  const colors = segments.map((s) => s.color);
  const total = values.reduce((a, b) => a + b, 0);
  const allZero = total === 0;

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    const dark = isDarkMode();
    const emptyColor = dark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
    const borderCol = dark ? "#141A28" : "#ffffff";

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    chartRef.current = new window.Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: allZero ? ["No data"] : segments.map((s) => s.label),
        datasets: [{
          data: allZero ? [1] : values,
          backgroundColor: allZero ? [emptyColor] : colors,
          borderColor: borderCol,
          borderWidth: 3,
          hoverOffset: allZero ? 0 : 6,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: !allZero,
            backgroundColor: dark ? "#141A28" : "#ffffff",
            titleColor: dark ? "#FFFFFF" : "#0F172A",
            bodyColor: dark ? "#9A8DB6" : "#64748B",
            borderColor: dark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    const dark = isDarkMode();
    const emptyColor = dark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
    chartRef.current.data.labels = allZero ? ["No data"] : segments.map((s) => s.label);
    chartRef.current.data.datasets[0].data = allZero ? [1] : values;
    chartRef.current.data.datasets[0].backgroundColor = allZero ? [emptyColor] : colors;
    chartRef.current.options.plugins.tooltip.enabled = !allZero;
    chartRef.current.update();
  }, [segments]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} role="img" aria-label="Donut chart showing pipeline status breakdown" />
    </div>
  );
}

// ── Modal Overlay ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, accentColor = "#4F46E5" }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col
          bg-white dark:bg-[#141A28]
          rounded-t-3xl sm:rounded-2xl
          border border-slate-200/80 dark:border-white/[0.07]
          shadow-popover overflow-hidden animate-slide-up sm:animate-scale-in"
      >
        <div className="h-[3px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }} />
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <div className="min-w-0 flex items-center gap-3">
            <span
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center shrink-0"
              style={{ background: `${accentColor}18`, color: accentColor }}
            >
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] sm:text-[16px] font-bold text-slate-900 dark:text-white truncate">{title}</h2>
              {subtitle && (
                <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn ml-3 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Heat helpers (shared) ─────────────────────────────────────────────────────
function heatFor(count) {
  if (count >= 10) return { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", bar: "#E11D48", label: "High" };
  if (count >= 5) return { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", bar: "#D97706", label: "Med" };
  return { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", bar: "#4F46E5", label: "Low" };
}

// ── Admin-level lead list (drill-down, shared by phone & email reveal modals) ─
function AdminLeadRevealList({ leads, onBack, adminName, maskFn, revealIcon: RevealIcon, accentColor }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) =>
      (l.name || "").toLowerCase().includes(q) ||
      (l.mobile || "").includes(q) ||
      (l.email || "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  const maxCount = Math.max(...leads.map((l) => l.count), 1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors group"
          style={{ color: accentColor }}
        >
          <span
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: `${accentColor}18` }}
          >
            ←
          </span>
          All Admins
        </button>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{adminName}</span>
        <span className="ml-auto shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {leads.length > 5 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search lead name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px]
              bg-[#FAF7FF] dark:bg-[#120B22]
              border border-slate-200 dark:border-white/10
              text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:border-violet-500
              transition-colors"
            style={{ "--tw-ring-color": `${accentColor}66` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-slate-100 dark:border-white/[0.06]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Lead</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Reveals</span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <RevealIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {search ? "No leads match your search." : "No reveals for this admin."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 mt-1">
          {filtered.map((item, i) => {
            const heat = heatFor(item.count);
            const pct = Math.round((item.count / maxCount) * 100);
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-3 rounded-xl
                  bg-[#FAF7FF] dark:bg-[#120B22]
                  border border-slate-200 dark:border-white/10
                  transition-colors"
                style={{ "--hover-border": accentColor }}
              >
                <span className="w-5 text-[11px] font-bold text-slate-400 dark:text-slate-400 shrink-0 tabular-nums text-center">
                  {i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accentColor}20` }}
                >
                  <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                    {(item.name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{item.name || "—"}</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">{maskFn(item.mobile || item.email)}</p>
                  <div className="mt-1.5 h-1 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: heat.bar }} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${heat.bg} ${heat.text}`}>
                    <RevealIcon className="w-3 h-3" /> {item.count}
                  </span>
                  <span className={`text-[10px] font-medium ${heat.text}`}>{heat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Generic Reveal Modal (used for both phone & email) ────────────────────────
function RevealModal({
  open, onClose, data, isSuperAdmin,
  title, accentColor,
  RevealIcon,
  maskFn,
  totalLabel,   // e.g. "total reveals"
  uniqueLabel,  // e.g. "unique leads viewed"
}) {
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  useEffect(() => { if (!open) setSelectedAdmin(null); }, [open]);
  if (!data) return null;

  const { topRevealed = [], totalReveals = 0, leadsRevealed = 0, byAdmin = [] } = data;

  // ── SuperAdmin: two-level view ────────────────────────────────────────────
  if (isSuperAdmin) {
    const adminList = byAdmin.length > 0 ? byAdmin : [];
    const maxAdminReveals = Math.max(...adminList.map((a) => a.totalReveals || 0), 1);

    return (
      <Modal
        open={open}
        onClose={() => { setSelectedAdmin(null); onClose(); }}
        title={selectedAdmin ? `${title} · By Admin` : `${title} · By Admin`}
        subtitle={
          selectedAdmin
            ? `${selectedAdmin.leads?.length || 0} leads · ${selectedAdmin.totalReveals || 0} total reveals`
            : `${totalReveals} ${totalLabel} · ${adminList.length} admin${adminList.length !== 1 ? "s" : ""}`
        }
        accentColor={accentColor}
      >
        {selectedAdmin ? (
          <AdminLeadRevealList
            leads={selectedAdmin.leads || []}
            adminName={selectedAdmin.adminName}
            onBack={() => setSelectedAdmin(null)}
            maskFn={maskFn}
            revealIcon={RevealIcon}
            accentColor={accentColor}
          />
        ) : adminList.length === 0 ? (
          <div className="py-12 text-center">
            <RevealIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-[14px] text-slate-500 dark:text-slate-400">No {title.toLowerCase()} recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Admin</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Reveals</span>
            </div>
            {adminList
              .slice()
              .sort((a, b) => (b.totalReveals || 0) - (a.totalReveals || 0))
              .map((admin, i) => {
                const heat = heatFor(admin.totalReveals || 0);
                const pct = Math.round(((admin.totalReveals || 0) / maxAdminReveals) * 100);
                const initials = (admin.adminName || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedAdmin(admin)}
                    className="w-full text-left group flex items-center gap-3 sm:gap-4 px-3 py-3.5 rounded-xl
                      bg-[#FAF7FF] dark:bg-[#120B22]
                      border border-slate-200 dark:border-white/10
                      hover:bg-white dark:hover:bg-white/[0.05]
                      transition-all duration-150 focus:outline-none focus-visible:ring-2"
                  >
                    <span className="w-5 text-[11px] font-bold text-slate-400 dark:text-slate-400 shrink-0 tabular-nums text-center">
                      {i + 1}
                    </span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: `${accentColor}20` }}
                    >
                      <span className="text-[12px] font-bold" style={{ color: accentColor }}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {admin.adminName || "Unknown Admin"}
                        </p>
                        {admin.adminEmail && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate hidden sm:inline">
                            {admin.adminEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {admin.leadsRevealed || 0} unique lead{(admin.leadsRevealed || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: heat.bar }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${heat.bg} ${heat.text}`}>
                        <RevealIcon className="w-3 h-3" /> {admin.totalReveals || 0}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 group-hover:opacity-80 transition-colors" />
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </Modal>
    );
  }

  // ── Admin role: flat list ─────────────────────────────────────────────────
  const maxCount = Math.max(...topRevealed.map((x) => x.count), 1);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`${totalReveals} ${totalLabel} · ${leadsRevealed} ${uniqueLabel}`}
      accentColor={accentColor}
    >
      {topRevealed.length === 0 ? (
        <div className="py-12 text-center">
          <RevealIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="text-[14px] text-slate-500 dark:text-slate-400">No {title.toLowerCase()} recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 pb-1 mb-1 border-b border-slate-100 dark:border-white/[0.06]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Lead</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Views</span>
          </div>
          {topRevealed.map((item, i) => {
            const heat = heatFor(item.count);
            const pct = Math.round((item.count / maxCount) * 100);
            return (
              <div key={i} className="group flex items-center gap-3 sm:gap-4 px-3 py-3 rounded-xl hover:bg-[#FAF7FF] dark:hover:bg-[#1D1333] transition-colors">
                <span className="w-5 sm:w-6 text-[12px] font-bold text-slate-400 dark:text-slate-400 shrink-0 tabular-nums text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{maskFn(item.email || item.mobile)}</p>
                  <div className="mt-1.5 h-1 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden w-full">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: heat.bar }} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${heat.bg} ${heat.text}`}>
                    <RevealIcon className="w-3 h-3" /> {item.count}
                  </span>
                  <span className={`text-[10px] font-medium ${heat.text}`}>{heat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Phone Reveal Modal (kept as thin wrapper for backward compat) ─────────────
function PhoneRevealModal({ open, onClose, data, isSuperAdmin }) {
  return (
    <RevealModal
      open={open}
      onClose={onClose}
      data={data}
      isSuperAdmin={isSuperAdmin}
      title="Phone Reveals"
      accentColor="#7E14FF"
      RevealIcon={Eye}
      maskFn={maskPhone}
      totalLabel="total reveals"
      uniqueLabel="unique leads viewed"
    />
  );
}

// ── Email Reveal Modal ────────────────────────────────────────────────────────
function EmailRevealModal({ open, onClose, data, isSuperAdmin }) {
  return (
    <RevealModal
      open={open}
      onClose={onClose}
      data={data}
      isSuperAdmin={isSuperAdmin}
      title="Email Reveals"
      accentColor="#0891B2"
      RevealIcon={Mail}
      maskFn={maskEmail}
      totalLabel="total reveals"
      uniqueLabel="unique leads viewed"
    />
  );
}

// ── Leads Detail Modal ────────────────────────────────────────────────────────
function LeadsDetailModal({ open, onClose, title, leads, accentColor, TitleIcon }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.agent || "").toLowerCase().includes(q) ||
        (l.status || "").toLowerCase().includes(q) ||
        (l.source || "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  const statusColors = {
    "Converted": { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "#10B981" },
    "In Progress": { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "#D97706" },
    "Not Interested": { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "#E11D48" },
    "New": { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", dot: "#4F46E5" },
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`${leads.length} leads total${filtered.length !== leads.length ? ` · ${filtered.length} shown` : ""}`}
      accentColor={accentColor}
    >
      {leads.length > 5 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, agent, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px]
              bg-[#FAF7FF] dark:bg-[#120B22]
              border border-slate-200 dark:border-white/10
              text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500
              transition-colors"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          {TitleIcon && <TitleIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />}
          <p className="text-[14px] text-slate-500 dark:text-slate-400">
            {search ? "No leads match your search." : "No leads found."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead, i) => {
            const sc = statusColors[lead.status] || statusColors["New"];
            return (
              <div
                key={lead.id || i}
                className="flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl
                  bg-[#FAF7FF] dark:bg-[#120B22]
                  border border-slate-200 dark:border-white/10
                  hover:border-violet-300 dark:hover:border-violet-800
                  transition-colors"
              >
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-white shrink-0"
                  style={{ background: accentColor }}
                >
                  {(lead.name || "?").charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                      {lead.name || "—"}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: sc.dot }} />
                      {lead.status || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Users className="w-3 h-3 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                        {lead.agent || "Unassigned"}
                      </span>
                    </span>
                    {lead.source && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-400 truncate">· {lead.source}</span>
                    )}
                    {lead.date && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-400 hidden sm:inline">· {lead.date}</span>
                    )}
                  </div>
                </div>

                {lead.mobile && (
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                      {maskPhone(lead.mobile)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
const KPI_STYLES = {
  blue: { icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400", glow: "group-hover:shadow-glow-brand", bar: "from-violet-500 to-[#863BFF]" },
  green: { icon: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", glow: "", bar: "from-emerald-500 to-teal-500" },
  amber: { icon: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400", glow: "", bar: "from-amber-500 to-orange-500" },
  red: { icon: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400", glow: "", bar: "from-rose-500 to-rose-500" },
  purple: { icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400", glow: "", bar: "from-violet-500 to-purple-500" },
  cyan: { icon: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400", glow: "", bar: "from-sky-400 to-violet-500" },
};

function KpiCard({ label, value, sub, up, IconComponent, variant = "blue", onClick, clickable }) {
  const s = KPI_STYLES[variant] || KPI_STYLES.blue;
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
      className={`relative overflow-hidden surface-card p-4 sm:p-5 transition-all duration-300 ease-premium
        ${clickable
          ? "cursor-pointer hover:shadow-elevated hover:-translate-y-1 active:translate-y-0 select-none group"
          : "hover:shadow-card"
        }`}
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${s.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight pr-2">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {clickable && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
          <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${s.icon} ${clickable ? "group-hover:scale-110" : ""} transition-transform duration-300 ease-premium`}>
            {IconComponent && <IconComponent className="w-4 h-4" strokeWidth={2.2} />}
          </span>
        </div>
      </div>
      <div className="text-[26px] sm:text-[32px] font-extrabold text-slate-900 dark:text-white leading-none mb-2 tabular-nums tracking-tight">
        {value}
      </div>
      {sub && (
        <div className={`text-[11.5px] sm:text-[12.5px] font-semibold flex items-center gap-1 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
          {up
            ? <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            : <TrendingDown className="w-3.5 h-3.5 shrink-0" />
          }
          <span className="truncate font-medium text-slate-400 dark:text-slate-500">{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Range toggle ──────────────────────────────────────────────────────────────
function RangeToggle({ range, onChange }) {
  const RANGES = { today: "Today", week: "Week", month: "Month", quarter: "Qtr" };
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] rounded-xl p-1">
      {Object.entries(RANGES).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all duration-200 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
            ${range === key
              ? "bg-white dark:bg-[#141A28] text-slate-900 dark:text-white shadow-xs"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
        <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-400 truncate">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-[12px] font-bold text-rose-600 dark:text-rose-400 underline underline-offset-2 shrink-0 hover:text-rose-800 dark:hover:text-rose-300 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="ld-canvas min-h-screen px-4 sm:px-6 py-6 sm:py-8">
      <div className="skeleton h-28 sm:h-32 w-full rounded-3xl mb-6 sm:mb-8 skeleton-shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-24 sm:h-28 skeleton-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 skeleton h-56 sm:h-64 skeleton-shimmer" />
        <div className="skeleton h-56 sm:h-64 skeleton-shimmer" />
      </div>
    </div>
  );
}

// ── Source & pipeline colors ──────────────────────────────────────────────────
const SOURCE_COLORS = {
  "Google Ads": "#4F46E5",
  "Campaign": "#7E14FF",
  "Facebook Ads": "#0891B2",
  "Web Form": "#10B981",
  "Referral": "#D97706",
};

const PIPELINE_SEGMENTS_CONFIG = [
  { key: "new", label: "New", color: "#4F46E5" },
  { key: "progress", label: "In progress", color: "#D97706" },
  { key: "lost", label: "Not interested", color: "#E11D48" },
  { key: "converted", label: "Converted", color: "#10B981" },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [allLeads, setAllLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [dbAdmins, setDbAdmins] = useState([]);
  const [dbUsers, setDbUsers] = useState([]);
  const [companyPlan, setCompanyPlan] = useState("basic");
  const [superAdminPlan, setSuperAdminPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("week");
  const [superStats, setSuperStats] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [serverTotal, setServerTotal] = useState(null); // accurate company-wide lead count

  const [hotLeads, setHotLeads] = useState([]);
  const [warmLeads, setWarmLeads] = useState([]);

  const [phoneModal, setPhoneModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [hotModal, setHotModal] = useState(false);
  const [warmModal, setWarmModal] = useState(false);

  const chartReady = useChartJS();
  const role = getRole();
  const user = getStoredUser();
  const isSuperAdmin = role === "superadmin";

  // ── Fetch dashboard stats ─────────────────────────────────────────────────
  const fetchDashStats = () => {
    api.get("/admin/dashboard-stats")
      .then((r) => setDashStats(r.data))
      .catch(() => { });
  };

  // ── Fetch lead data ───────────────────────────────────────────────────────
  const loadData = (isRefresh = false) => {
    if (role === "user") { setLoading(false); return; }
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError(null);

    fetchAll()
      .then(({ agents, leads, stats, total }) => {
        const safeLeads = leads || [];
        setAgents(agents || []);
        setAllLeads(safeLeads);
        // `total` is the company-wide count from the paginated API (not capped
        // by the page limit), so the "Total Leads" KPI stays correct even though
        // only the first page of leads is loaded for the charts.
        if (typeof total === "number") setServerTotal(total);
        if (stats) setSuperStats(stats);
        setHotLeads(safeLeads.filter((l) => l.temperature === "Hot" || l.Quality === "Hot" || l.leadCategory === "Hot"));
        setWarmLeads(safeLeads.filter((l) => l.temperature === "Warm" || l.Quality === "Warm" || l.leadCategory === "Warm"));
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });

    if (role === "admin") {
      Promise.all([
        api.get("/admin/"),
        api.get("/admin/company/users"),
        api.get("/admin/company/me"),
      ])
        .then(([adminsRes, usersRes, companyRes]) => {
          setDbAdmins(adminsRes.data || []);
          const parsedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
          setDbUsers(parsedUsers);
          setCompanyPlan(companyRes.data?.plan || "basic");
        })
        .catch(() => { });
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/razorpay/subscription")
      .then((r) => {
        const nameToId = { Starter: "starter", Growth: "growth", Enterprise: "enterprise" };
        const planId = nameToId[r.data?.planName] || r.data?.planName?.toLowerCase() || "starter";
        setSuperAdminPlan(planId);
      })
      .catch(() => { setSuperAdminPlan("starter"); });
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchDashStats();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchDashStats();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const { planId } = useEntitlements();

  // ── Derived data ──────────────────────────────────────────────────────────
  const leads = useMemo(() => filterByRange(allLeads, range), [allLeads, range]);

  const kpi = useMemo(() => {
    // Prefer the accurate company-wide total (dashboard-stats aggregate, then the
    // paginated API's `total`) over allLeads.length, which is capped at the page
    // limit and would otherwise under-report (e.g. show 100 when there are 264).
    const accurateTotal =
      (dashStats && typeof dashStats.totalLeads === "number") ? dashStats.totalLeads
        : (typeof serverTotal === "number") ? serverTotal
          : allLeads.length;
    const converted = allLeads.filter((l) => l.status === "Converted").length;
    const rangeTotal = leads.length;
    return {
      total: accurateTotal,
      converted,
      rate: `${accurateTotal > 0 ? Math.round((converted / accurateTotal) * 100) : 0}%`,
      rangeTotal,
    };
  }, [leads, allLeads, dashStats, serverTotal]);

  const chart = useMemo(() => buildChartBuckets(leads, range), [leads, range]);

  const pipeline = useMemo(() => ({
    new: leads.filter((l) => l.status === "New").length,
    progress: leads.filter((l) => l.status === "In Progress").length,
    lost: leads.filter((l) => l.status === "Not Interested").length,
    converted: leads.filter((l) => l.status === "Converted").length,
  }), [leads]);

  const agentStats = useMemo(
    () =>
      agents
        .map((a) => {
          const al = leads.filter((l) => l.agent === a.name);
          return { ...a, leads: al.length, conv: al.filter((l) => l.status === "Converted").length };
        })
        .sort((a, b) => b.leads - a.leads),
    [leads, agents]
  );

  const sourceStats = useMemo(() => {
    const total = leads.length || 1;
    const counts = leads.reduce((acc, l) => {
      const src = l.source?.trim();
      if (src) acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    const FALLBACK_COLORS = [
      "#4F46E5", "#7E14FF", "#0891B2", "#10B981",
      "#D97706", "#E11D48", "#0D9488", "#9333EA",
    ];
    return Object.entries(counts)
      .map(([label, count], i) => ({
        label,
        count,
        color: SOURCE_COLORS[label] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        pct: Math.round((count / total) * 100),
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const activity = useMemo(
    () =>
      [...allLeads]
        .sort((a, b) => String(b.id).localeCompare(String(a.id)))
        .slice(0, 6)
        .map((l) => ({
          text: `${l.agent} · ${l.name} — ${l.status}`,
          time: l.date,
          dot:
            l.status === "Converted" ? "#10B981"
              : l.status === "In Progress" ? "#D97706"
                : l.status === "Not Interested" ? "#E11D48"
                  : "#4F46E5",
        })),
    [allLeads]
  );

  const maxLeads = Math.max(...agentStats.map((a) => a.leads), 1);
  const pipelineSegs = PIPELINE_SEGMENTS_CONFIG.map((cfg) => ({ label: cfg.label, color: cfg.color, value: pipeline[cfg.key] }));
  const pipelineTotal = pipelineSegs.reduce((s, x) => s + x.value, 0);
  const uniqueSources = [...new Set(allLeads.map((l) => l.source))].length;
  const uniqueCampaigns = [...new Set(allLeads.map((l) => l.campaign).filter((c) => c && c !== "—"))].length;

  if (loading) return <Skeleton />;

  return (
    <div className="ld-canvas min-h-screen font-poppins px-4 sm:px-6 py-6 sm:py-8">

      {/* ── Welcome Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient mb-6 sm:mb-8 shadow-[0_18px_40px_-18px_rgba(99,0,214,0.65)]">
        <div className="absolute inset-0 bg-mesh-hero" />
        <div className="relative flex flex-wrap items-start sm:items-center justify-between gap-4 px-5 sm:px-8 py-6 sm:py-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                <Sparkles className="w-3.5 h-3.5" />
                {getGreeting()}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 bg-white/15 text-white backdrop-blur-sm`}
              >
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-extrabold text-white tracking-tight leading-tight">
              {user?.name || "Admin"}
            </h1>
            <p className="text-[12.5px] sm:text-[13.5px] text-white/70 mt-1.5 truncate">
              {isSuperAdmin
                ? `${kpi.total.toLocaleString()} total leads across your organization`
                : `${kpi.total.toLocaleString()} total leads · ${agents.length} team members`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end pr-4 mr-1 border-r border-white/15">
              <span className="text-[20px] font-extrabold text-white leading-none tabular-nums">{kpi.rate}</span>
              <span className="text-[10.5px] font-medium text-white/60 mt-1">conversion rate</span>
            </div>
            <button
              onClick={() => { loadData(true); fetchDashStats(); }}
              disabled={refreshing}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl
                bg-white/10 hover:bg-white/20 border border-white/15
                text-white text-[12.5px] font-semibold backdrop-blur-sm
                transition-all duration-200 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                ${refreshing ? "opacity-60 cursor-not-allowed" : ""}`}
              title="Refresh data"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && <ErrorBanner message={error} onRetry={() => loadData()} />}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <KpiCard label="Total Leads" value={kpi.total.toLocaleString()} sub={`${kpi.rangeTotal} in selected range`} up IconComponent={Users} variant="blue" />
        <KpiCard label="Conversions" value={kpi.converted.toLocaleString()} sub={`${kpi.rate} conversion rate`} up={kpi.converted > 0} IconComponent={CheckCircle} variant="green" />
        <KpiCard label="Conv. Rate" value={kpi.rate} sub={`${pipeline.progress} in progress`} up={parseInt(kpi.rate, 10) >= 15} IconComponent={BarChart2} variant="amber" />
        <KpiCard label="Not Interested" value={pipeline.lost.toLocaleString()} sub="Review needed" up={false} IconComponent={Clock} variant="red" />
      </div>

      {/* ── Quality KPI row + Phone & Email Reveal Stats ── */}
      {dashStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <KpiCard
            label="Hot Leads"
            value={(dashStats.quality?.hot ?? 0).toLocaleString()}
            sub="All fields filled · Tap to view"
            up={(dashStats.quality?.hot ?? 0) > 0}
            IconComponent={Flame}
            variant="red"
            clickable
            onClick={() => setHotModal(true)}
          />
          <KpiCard
            label="Warm Leads"
            value={(dashStats.quality?.warm ?? 0).toLocaleString()}
            sub="Partially filled · Tap to view"
            up={(dashStats.quality?.warm ?? 0) > 0}
            IconComponent={Thermometer}
            variant="amber"
            clickable
            onClick={() => setWarmModal(true)}
          />
          <KpiCard
            label="Phone Reveals"
            value={(dashStats.phoneReveal?.totalReveals ?? 0).toLocaleString()}
            sub={`${dashStats.phoneReveal?.leadsRevealed ?? 0} leads · Tap to view`}
            up={false}
            IconComponent={Eye}
            variant="purple"
            clickable
            onClick={() => { fetchDashStats(); setPhoneModal(true); }}
          />
          <KpiCard
            label="Email Reveals"
            value={(dashStats.emailReveal?.totalReveals ?? 0).toLocaleString()}
            sub={`${dashStats.emailReveal?.leadsRevealed ?? 0} leads · Tap to view`}
            up={false}
            IconComponent={Mail}
            variant="cyan"
            clickable
            onClick={() => { fetchDashStats(); setEmailModal(true); }}
          />
        </div>
      )}

      {/* ── Chart row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">

        <div className="lg:col-span-2 surface-card surface-card-hover p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
              <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">Leads over time</h2>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="w-3 h-1.5 rounded-full bg-violet-600 inline-block shrink-0" />
                  New leads
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-block shrink-0" style={{ width: 14, height: 0, borderTop: "2px dashed #10B981", verticalAlign: "middle" }} />
                  Converted
                </span>
              </div>
            </div>
            <RangeToggle range={range} onChange={setRange} />
          </div>

          {leads.length === 0 ? (
            <div className="h-[180px] sm:h-[200px] flex flex-col items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              <BarChart2 className="w-8 h-8 opacity-40" />
              No leads in this period
            </div>
          ) : chartReady ? (
            <LineChart data1={chart.new} data2={chart.conv} labels={chart.labels} />
          ) : (
            <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-[12px] text-slate-500 dark:text-slate-400">
              Loading chart…
            </div>
          )}
        </div>

        <div className="surface-card surface-card-hover p-4 sm:p-5">
          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white mb-4 sm:mb-5">Pipeline status</h2>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
              {chartReady ? (
                <DonutChart segments={pipelineSegs} />
              ) : (
                <div className="w-full h-full rounded-full border-4 border-slate-200 dark:border-white/10" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] sm:text-[20px] font-bold text-slate-900 dark:text-white leading-none tabular-nums">
                  {pipelineTotal.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">total</span>
              </div>
            </div>
            <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
              {pipelineSegs.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 flex-1 leading-none truncate">{s.label}</span>
                  <span className="text-[11px] sm:text-[12px] font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                    {s.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

        <div className="surface-card surface-card-hover p-4 sm:p-5">
          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
            {isSuperAdmin ? "Top employees" : "Employee performance"}
          </h2>
          {agentStats.every((a) => a.leads === 0) ? (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">No activity in this period.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {agentStats.map((a) => (
                <div key={a.name}>
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shrink-0"
                        style={{ background: a.color }}
                      >
                        {a.avatar}
                      </div>
                      <span className="text-[11px] sm:text-[12px] font-medium text-slate-900 dark:text-white truncate">{a.name}</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {a.conv} conv
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 sm:h-2 bg-slate-50 dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((a.leads / maxLeads) * 100)}%`, background: a.color }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 w-6 sm:w-8 text-right tabular-nums shrink-0">
                      {a.leads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card surface-card-hover p-4 sm:p-5">
          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">Leads by source</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {sourceStats.length === 0 ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400">No data for this period.</p>
            ) : (
              sourceStats.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-[11px] sm:text-[12px] text-slate-600 dark:text-slate-300 truncate">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{s.count}</span>
                      <span className="text-[11px] sm:text-[12px] font-semibold text-slate-900 dark:text-white tabular-nums w-7 sm:w-8 text-right">
                        {s.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 sm:h-1.5 bg-slate-50 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Total leads", value: allLeads.length },
              { label: "Active users", value: agents.length },
              { label: "Sources", value: uniqueSources },
              { label: "Campaigns", value: uniqueCampaigns },
            ].map((s) => (
              <div key={s.label} className="bg-[#FAF7FF] dark:bg-[#120B22] rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5">
                <div className="text-[14px] sm:text-[16px] font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card surface-card-hover p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">Recent activity</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <div className="space-y-0">
            {activity.length === 0 ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400 py-4">No recent activity.</p>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex gap-2.5 sm:gap-3 py-2.5 sm:py-3 border-b border-slate-100 dark:border-white/10 last:border-0">
                  <div className="mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ background: a.dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-slate-600 dark:text-slate-300 leading-snug truncate">{a.text}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 block">{a.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-components ── */}
      <AdminChat />
      <div className="mt-5 p-2">
        <AdminAttendanceView />
      </div>

      {isSuperAdmin && <SuperAdminFilter />}

      {isSuperAdmin && superAdminPlan !== null && (
        <UserManagement
          currentPlan={superAdminPlan}
          existingAdmins={[]}
          existingUsers={[]}
        />
      )}

      {role === "admin" && (
        <UserManagement
          currentPlan={companyPlan}
          existingAdmins={dbAdmins}
          existingUsers={dbUsers}
        />
      )}

      {/* ── Modals ── */}
      <PhoneRevealModal
        open={phoneModal}
        onClose={() => setPhoneModal(false)}
        data={dashStats?.phoneReveal}
        isSuperAdmin={isSuperAdmin}
      />

      <EmailRevealModal
        open={emailModal}
        onClose={() => setEmailModal(false)}
        data={dashStats?.emailReveal}
        isSuperAdmin={isSuperAdmin}
      />

      <LeadsDetailModal
        open={hotModal}
        onClose={() => setHotModal(false)}
        title="Hot Leads"
        leads={hotLeads}
        accentColor="#E11D48"
        TitleIcon={Flame}
      />

      <LeadsDetailModal
        open={warmModal}
        onClose={() => setWarmModal(false)}
        title="Warm Leads"
        leads={warmLeads}
        accentColor="#D97706"
        TitleIcon={Thermometer}
      />
    </div>
  );
}