import { useState, useEffect, useMemo, useRef } from "react";
import useEntitlements from "../hooks/useEntitlements";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { clearAllCache } from "../data/axiosConfig";
import {
  LayoutGrid, Users, FileBarChart, Megaphone, MessageSquare, ClipboardList,
  Workflow, CalendarCheck2, BarChart3, Table2, Building2, CreditCard,
  SlidersHorizontal, Search, ChevronLeft, X, LogOut, Command,
  CornerDownLeft, ArrowUp, ArrowDown,
} from "lucide-react";

// ── Nav items for ADMIN ───────────────────────────────────────────────────────
// NOTE: routes, labels and featureKey gating are UNCHANGED from the previous
// sidebar — only the icon representation (now a lucide-react component
// reference instead of inline SVG markup) and the presentational grouping
// below are new. No route, permission or API behaviour was touched.
const ADMIN_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/reportpage", label: "Report Page", featureKey: "basic-reports", icon: FileBarChart },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/communications", label: "Communications", featureKeyAny: ["sms-blast", "whatsapp-blast", "email-blast"], icon: MessageSquare },
  { to: "/daily-report", label: "Daily Report", featureKey: "daily-report", icon: ClipboardList },
  { to: "/nurture-sequence", label: "Lead Nurture", featureKey: "leadNurtureSequence", icon: Workflow },
  { to: "/attendance", label: "Attendance", featureKey: "attendance", icon: CalendarCheck2 },
];

// ── Extra nav items for SUPERADMIN only ───────────────────────────────────────
const SUPERADMIN_EXTRA_ITEMS = [
  { to: "/custom-reports", label: "Custom Reports", icon: BarChart3 },
];

// ── Nav items for USER role ───────────────────────────────────────────────────
const USER_NAV_ITEMS = [
  { to: "/user/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/leads", label: "My Leads", icon: Users },
  { to: "/user/communications", label: "Communications", featureKeyAny: ["sms-blast", "whatsapp-blast", "email-blast"], icon: MessageSquare },
  { to: "/daily-report", label: "Daily Report", icon: ClipboardList },
  { to: "/user/sheet-integration", label: "Excel / Google Sheet", featureKey: "googleSheetIntegrationEnabled", icon: Table2 },
];

// ── Nav items for DEVELOPER role ──────────────────────────────────────────────
const DEVELOPER_NAV_ITEMS = [
  { to: "/developer/dashboard", label: "Platform Dashboard", icon: LayoutGrid },
  { to: "/developer/companies", label: "Companies", icon: Building2 },
  { to: "/developer/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/developer/plan-customization", label: "Plan Customization", icon: SlidersHorizontal },
];

// ── Presentational-only grouping. Purely visual section headers — every item
// still comes from (and is still filtered by) the arrays above, so adding a
// route here later just means it falls into "More" rather than breaking. ────
const NAV_GROUPS = {
  admin: [
    { title: "Overview", routes: ["/dashboard"] },
    { title: "Pipeline", routes: ["/leads", "/campaigns", "/nurture-sequence"] },
    { title: "Insights", routes: ["/reportpage", "/custom-reports"] },
    { title: "Operations", routes: ["/communications", "/daily-report", "/attendance"] },
  ],
  user: [
    { title: "Overview", routes: ["/user/dashboard"] },
    { title: "My work", routes: ["/leads", "/daily-report"] },
    { title: "Tools", routes: ["/user/communications", "/user/sheet-integration"] },
  ],
  developer: [
    { title: "Platform", routes: ["/developer/dashboard", "/developer/companies"] },
    { title: "Billing", routes: ["/developer/subscriptions", "/developer/plan-customization"] },
  ],
};

function groupNavItems(items, groupKey) {
  const groups = NAV_GROUPS[groupKey] || [];
  const used = new Set();
  const sections = groups
    .map((g) => {
      const groupItems = items.filter((it) => g.routes.includes(it.to));
      groupItems.forEach((it) => used.add(it.to));
      return { title: g.title, items: groupItems };
    })
    .filter((g) => g.items.length > 0);
  const leftover = items.filter((it) => !used.has(it.to));
  if (leftover.length) sections.push({ title: "More", items: leftover });
  return sections;
}

// ── Command palette — Cmd/Ctrl+K jump-to-page. Client-side only: it just
// navigates via react-router, nothing is fetched or mutated. ────────────────
function CommandPalette({ open, onClose, items, roleLabel }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => { if (open) { setQuery(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && results[active]) { navigate(results[active].to); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, results, active, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg surface-card !rounded-2xl shadow-popover overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Jump to a page… (${roleLabel})`}
            className="flex-1 bg-transparent text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-white/10 rounded-md px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin p-2">
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-8">No pages match "{query}"</p>
          ) : (
            results.map((it, i) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onClose}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors
                    ${i === active
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {it.label}
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
                </Link>
              );
            })
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> open</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [minimized, setMinimized] = useState(
    () => localStorage.getItem("sidebar_minimized") === "true"
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [followUpAlerts, setFollowUpAlerts] = useState({ todayCount: 0, overdueCount: 0 });
  // Total unread inbound WhatsApp messages (red badge on Communications)
  const [waUnread, setWaUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Track viewport so the minimized (72px icon-rail) layout never applies on
  // mobile — there the sidebar is a full-width slide-in drawer, and a cramped
  // icon rail would be confusing. md breakpoint = 768px.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);
  // On mobile, always render the full (non-minimized) layout.
  const effMinimized = minimized && !isMobile;

  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const rawRole = user?.role?.toLowerCase() || "user";

  const role = rawRole === "superadmin" ? "super_admin" : rawRole;
  const isSuperAdmin = role === "super_admin";
  const isDeveloper = role === "developer";

  // ── Sidebar branding is fixed — always shows LAUNCHERDESK identity ─────────────
  const companyName = "LAUNCHERDESK";
  const companyLogo = "/launcherdesk_logo.svg";

  // ── Entitlement-driven feature gating ────────────────────────────────────
  // Switched from usePlanFeatures to useEntitlements for richer helpers.
  // hasFeature() behaviour is unchanged — sidebar items are filtered by plan.
  // readOnlyMode adds a visual indicator in the footer area.
  const {
    hasFeature,
    readOnlyMode,
    subscriptionStatus,
    refreshEntitlements,
  } = useEntitlements();

  // ── Poll follow-up alerts every 5 minutes (skip for developer) ────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || isDeveloper) return;
    const isAdmin = role === "admin" || role === "super_admin";
    const endpoint = isAdmin ? "/lead/admin/follow-up-alerts" : "/lead/follow-up-alerts";
    const fetchAlerts = async () => {
      try {
        const res = await api.get(endpoint);
        setFollowUpAlerts({
          todayCount: res.data.todayCount || 0,
          overdueCount: res.data.overdueCount || 0,
        });
      } catch (_) { /* silent */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WhatsApp unread total for the Communications badge ─────────────────────
  // Mirrors the red badge in the Communications lead list. Counts inbound
  // messages the leads sent that haven't been opened yet. Refreshes on a timer,
  // whenever the route changes (so it clears right after reading a chat), and
  // whenever a new WhatsApp message arrives via socket.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || isDeveloper) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api.get("/whatsapp/unread-counts");
        const total = Object.values(data?.byLead || {}).reduce((a, b) => a + (b || 0), 0);
        setWaUnread(total);
      } catch (_) { /* silent — badge just stays as-is */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60 * 1000);
    return () => clearInterval(interval);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh entitlements when plan_updated fires (e.g. after payment) ────
  useEffect(() => {
    const handler = () => refreshEntitlements();
    window.addEventListener("plan_updated", handler);
    return () => window.removeEventListener("plan_updated", handler);
  }, [refreshEntitlements]);

  // ── Global Cmd/Ctrl+K shortcut + listener for the navbar's search trigger ──
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    const onExternalOpen = () => setPaletteOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("open_command_palette", onExternalOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("open_command_palette", onExternalOpen);
    };
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const roleStyle = {
    super_admin: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-500 dark:text-amber-400" },
    admin: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-500 dark:text-violet-400" },
    user: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-500 dark:text-blue-400" },
    developer: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-500 dark:text-emerald-400" },
  }[role] ?? { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-500 dark:text-blue-400" };

  const roleLabel = { super_admin: "Super Admin", admin: "Admin", developer: "Developer", user: "Employee" }[role] || "Employee";

  // ── Build nav items based on role, filtered by entitlement feature flags ──
  // NOTE: Items without a featureKey are always shown regardless of plan.
  //       Items WITH a featureKey are hidden if hasFeature() returns false —
  //       which is now driven by the entitlements API, not hardcoded plan names.
  const ALL_NAV_ITEMS =
    isDeveloper ? DEVELOPER_NAV_ITEMS :
      role === "user" ? USER_NAV_ITEMS :
        isSuperAdmin ? [...ADMIN_NAV_ITEMS, ...SUPERADMIN_EXTRA_ITEMS] :
          ADMIN_NAV_ITEMS;

  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => {
    if (Array.isArray(item.featureKeyAny) && item.featureKeyAny.length) {
      return item.featureKeyAny.some(k => hasFeature(k));
    }
    return !item.featureKey || hasFeature(item.featureKey);
  });

  const groupKey = isDeveloper ? "developer" : role === "user" ? "user" : "admin";
  const navSections = groupNavItems(NAV_ITEMS, groupKey);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Wipe the in-memory GET cache — otherwise the next admin who logs in on
    // this same tab (no full page reload happens here) can be served this
    // admin's cached dashboard/leads data for up to 30 seconds.
    clearAllCache();
    // Notify same-tab NotificationProvider so socket disconnects immediately
    window.dispatchEvent(new Event("user_changed"));
    navigate("/login", { replace: true });
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ── Read-only status pill — shown in sidebar footer for admin/superadmin ──
  const READ_ONLY_STATUS_STYLES = {
    suspended: { bg: "bg-rose-500/10", text: "text-rose-500 dark:text-rose-400", dot: "bg-rose-500", label: "Suspended" },
    paused: { bg: "bg-amber-500/10", text: "text-amber-500 dark:text-amber-400", dot: "bg-amber-500", label: "Paused" },
    expired: { bg: "bg-orange-500/10", text: "text-orange-500 dark:text-orange-400", dot: "bg-orange-500", label: "Expired" },
    cancelled: { bg: "bg-rose-500/10", text: "text-rose-500 dark:text-rose-400", dot: "bg-rose-500", label: "Cancelled" },
  };
  const readOnlyStyle = READ_ONLY_STATUS_STYLES[subscriptionStatus] || null;

  return (
    <>
      <style>{`
        .sidebar { transition: width 0.32s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0; overflow: visible; }
        .nav-label { transition: opacity 0.2s ease; white-space: nowrap; overflow: hidden; flex-shrink: 0; }
        .rail-tooltip {
          pointer-events: none; opacity: 0; transform: translateX(-6px) scale(0.98);
          transition: opacity 0.15s ease, transform 0.15s ease; white-space: nowrap;
        }
        .nav-item:hover .rail-tooltip, .logout-btn:hover .rail-tooltip { opacity: 1; transform: translateX(0) scale(1); }
        .nav-item, .logout-btn { transition: background 0.18s ease, color 0.18s ease; position: relative; overflow: visible; }
        .icon-wrap { transition: transform 0.18s cubic-bezier(0.16,1,0.3,1); flex-shrink: 0; }
        .nav-item:hover .icon-wrap, .logout-btn:hover .icon-wrap { transform: scale(1.1); }
        .active-glow { box-shadow: 0 1px 2px rgba(79,70,229,0.06); }
      `}</style>

      {/* ── Command palette ───────────────────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={NAV_ITEMS}
        roleLabel={roleLabel}
      />

      {/* ── Logout Confirmation Modal ─────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="surface-card !rounded-2xl p-6 w-full max-w-sm mx-4 shadow-popover animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-5 h-5 text-rose-500" />
            </div>
            <h2 className="text-[16px] font-bold text-center text-slate-900 dark:text-white mb-1">Sign out?</h2>
            <p className="text-[13px] text-center text-slate-400 mb-6">
              You'll need to log in again to access your account.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="btn-secondary btn-md flex-1">
                Cancel
              </button>
              <button onClick={handleLogout} className="btn-danger btn-md flex-1">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile overlay backdrop ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile hamburger FAB ──────────────────────────────────────────── */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#141A28] border border-slate-200 dark:border-white/10 shadow-elevated text-slate-600 dark:text-slate-300"
        onClick={() => setMobileOpen((v) => !v)}
        title="Toggle menu"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div
        className={`sidebar h-screen flex flex-col bg-white dark:bg-[#141A28] border-r border-slate-200/80 dark:border-white/[0.06]
          fixed md:sticky inset-y-0 left-0 z-40 top-0
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ width: effMinimized ? "80px" : "272px" }}
      >
        {/* Header — brand mark + collapse toggle */}
        <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0 ${effMinimized ? "justify-center px-3" : ""}`}>
          <div
            className={`relative shrink-0 ${effMinimized ? "cursor-pointer" : ""}`}
            onClick={() => { if (effMinimized) { localStorage.setItem("sidebar_minimized", "false"); setMinimized(false); } }}
            title={effMinimized ? "Expand sidebar" : undefined}
          >
            <img
              src={companyLogo}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 dark:border-white/10 p-1.5 object-contain shadow-xs"
              alt={companyName}
              onError={e => { e.currentTarget.src = "/launcherdesk_logo.svg"; }}
            />
          </div>
          {!effMinimized && (
            <>
              <span className="nav-label font-bold text-[14px] tracking-tight text-slate-900 dark:text-white truncate flex-1">
                {companyName}
              </span>
              {!isMobile && (
                <button
                  onClick={() => { localStorage.setItem("sidebar_minimized", "true"); setMinimized(true); }}
                  className="icon-btn w-7 h-7 shrink-0"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Workspace profile card */}
        {user && (
          <div className={`mx-3 mt-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.03] ${effMinimized ? "p-2 flex justify-center" : "p-3 flex items-center gap-2.5"}`}>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[11px] font-bold shrink-0 ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text}`}>
              {initials}
            </div>
            {!effMinimized && (
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                <span className={`inline-flex mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick search → opens command palette (Cmd/Ctrl+K) + filters the nav below */}
        {!effMinimized && (
          <div className="px-3 mt-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px]
                bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]
                text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-white/10
                transition-colors"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Search or jump to…</span>
              <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-white/10 rounded px-1 py-0.5">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-4 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title}>
              {!effMinimized && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  const isDailyReport = item.to === "/daily-report";
                  const isComms = item.to === "/communications" || item.to === "/user/communications";
                  const hasWaUnread = isComms && waUnread > 0;
                  const hasOverdue = isDailyReport && followUpAlerts.overdueCount > 0;
                  const hasToday = isDailyReport && !hasOverdue && followUpAlerts.todayCount > 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium
                        ${isActive
                          ? "active-glow bg-indigo-50 dark:bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-300"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-brand-gradient" />
                      )}
                      <span className="icon-wrap relative">
                        <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                        {hasOverdue && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#141A28] animate-pulse" title={`${followUpAlerts.overdueCount} overdue follow-up${followUpAlerts.overdueCount > 1 ? "s" : ""}`} />
                        )}
                        {hasToday && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-[#141A28]" title={`${followUpAlerts.todayCount} follow-up${followUpAlerts.todayCount > 1 ? "s" : ""} due today`} />
                        )}
                        {hasWaUnread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#141A28]" title={`${waUnread} unread WhatsApp message${waUnread > 1 ? "s" : ""}`} />
                        )}
                      </span>
                      {!effMinimized && (
                        <span className="nav-label flex items-center gap-1.5 flex-1">
                          {item.label}
                          {hasWaUnread && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                              {waUnread > 99 ? "99+" : waUnread}
                            </span>
                          )}
                          {hasOverdue && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                              {followUpAlerts.overdueCount > 9 ? "9+" : followUpAlerts.overdueCount}
                            </span>
                          )}
                          {hasToday && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              {followUpAlerts.todayCount > 9 ? "9+" : followUpAlerts.todayCount}
                            </span>
                          )}
                        </span>
                      )}
                      {effMinimized && (
                        <span className="rail-tooltip absolute left-[72px] z-50 bg-slate-900 dark:bg-slate-800 text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-popover">
                          {item.label}
                          {hasOverdue && ` (${followUpAlerts.overdueCount} overdue)`}
                          {hasToday && ` (${followUpAlerts.todayCount} today)`}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-white/[0.06] flex flex-col gap-1 shrink-0">
          {/* Read-only indicator — shown when subscription is not active/trial */}
          {readOnlyMode && !isDeveloper && !effMinimized && readOnlyStyle && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 ${readOnlyStyle.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${readOnlyStyle.dot}`} />
              <span className={`text-[11px] font-semibold ${readOnlyStyle.text}`}>
                Read-only — {readOnlyStyle.label}
              </span>
            </div>
          )}
          {readOnlyMode && !isDeveloper && effMinimized && readOnlyStyle && (
            <div className="relative flex justify-center mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${readOnlyStyle.dot}`} />
              <span className="rail-tooltip absolute left-[72px] z-50 bg-slate-900 dark:bg-slate-800 text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-popover">
                Read-only — {readOnlyStyle.label}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`logout-btn flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium w-full
              text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300
              ${effMinimized ? "justify-center" : ""}`}
          >
            <span className="icon-wrap"><LogOut className="w-[18px] h-[18px]" /></span>
            {!effMinimized && <span className="nav-label">Sign out</span>}
            {effMinimized && (
              <span className="rail-tooltip absolute left-[72px] z-50 bg-slate-900 dark:bg-slate-800 text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-popover">
                Sign out
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}