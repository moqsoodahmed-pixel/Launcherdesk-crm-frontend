import { BrowserRouter, Route, Routes, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import React from "react";
import { Sidebar } from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import api from "./data/axiosConfig";
import ExpiryBanner, { SuspensionScreen } from "./components/ExpiryBanner";
import EntitlementStatusBanner from "./components/EntitlementStatusBanner";
import TrialGate from "./components/TrialGate";
import FeatureGate from "./components/FeatureGate";
import ClockInGate from "./components/ClockInGate";
import TermsGate from "./components/TermsGate";
import { NotificationProvider, NotificationBell } from "./components/NotificationProvider";
import { clearFeaturesCache } from "./hooks/usePlanFeatures";
import TelegramSettings from "./components/TelegramSettings";
import DailyReportTelegramSettings from "./components/DailyReportTelegramSettings";
import SheetIntegrationAdminSettings from "./components/SheetIntegrationAdminSettings";
import {
  Search, Command, Plus, ChevronDown, ChevronRight, Users, Megaphone,
  MessageSquare, Calendar,
} from "lucide-react";

// ── Lazy-loaded pages — each becomes its own chunk ────────────────────────────
const Dashboard = lazy(() => import("./components/Dashboard"));
const Campaigns = lazy(() => import("./components/Campaigns"));
const Dailyreport = lazy(() => import("./components/DailyReport"));
const NurtureSequenceBuilder = lazy(() => import("./pages/Admin/NurtureSequenceBuilder"));
const ReportPage = lazy(() => import("./components/ReportPage"));
const PerfMarketing = lazy(() => import("./components/PerformanceMarketingDashboard"));
const MktLogin = lazy(() => import("./marketing/MarketingLogin"));
const MktDashboard = lazy(() => import("./marketing/MarketingDashboard"));
const AdminLeadsPage = lazy(() => import("./components/AdminLeadsPage"));
const Communications = lazy(() => import("./components/Communications"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const UpgradePlan = lazy(() => import("./components/UpgradePlan"));

// User pages
const UserLogin = lazy(() => import("./pages/UserLogin"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const UserDailyReport = lazy(() => import("./pages/UserDailyReport"));
const UserLeadsPage = lazy(() => import("./pages/UserLeadsPage"));
const UserLeadCommunication = lazy(() => import("./pages/UserLeadCommunication"));
const UserSheetIntegration = lazy(() => import("./pages/UserSheetIntegration"));

// Developer pages
const DeveloperDashboard = lazy(() => import("./pages/developer/DeveloperDashboard"));
const DeveloperCompanies = lazy(() => import("./pages/developer/Companies"));
const DeveloperCompanyDetails = lazy(() => import("./pages/developer/CompanyDetails"));
const DeveloperSubscriptions = lazy(() => import("./pages/developer/Subscriptions"));
const DeveloperPlanCustomization = lazy(() => import("./pages/developer/PlanCustomization"));
const DeveloperAddonManager = lazy(() => import("./pages/developer/AddonManagerPage"));

// Auth pages
const AdminLogin = lazy(() => import("./pages/UserLogin")); // /admin/login now redirects to the unified login
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const CustomReports = lazy(() => import("./pages/CustomReports"));
const InvoiceTest = lazy(() => import("./pages/InvoiceTest"));

// ── Page loader ───────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-2 dark:bg-boxdark-2">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-[13px] text-body dark:text-bodydark font-medium">Loading…</p>
      </div>
    </div>
  );
}

// ── Error boundary — catches lazy chunk load failures and auto-retries ────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retrying: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("dynamically imported module") ||
      error?.message?.includes("Failed to fetch dynamically");

    if (isChunkError && !this.state.retrying) {
      this.setState({ retrying: true });
      setTimeout(() => {
        this.setState({ hasError: false, retrying: false });
      }, 800);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-screen bg-[#F0F4FF] dark:bg-[#0D0F14]">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            {this.state.retrying ? (
              <>
                <svg className="w-8 h-8 animate-spin text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-[13px] text-[#8B92A9] font-medium">Retrying…</p>
              </>
            ) : (
              <>
                <p className="text-[14px] text-[#4B5168] dark:text-[#9DA3BB] font-medium">
                  Something went wrong loading this page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-[#7E14FF] text-white text-[13px] font-semibold hover:bg-[#6300D6] transition"
                >
                  Reload page
                </button>
              </>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getStoredAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return { token, user };
}

// ── Auth Navigation Guard ─────────────────────────────────────────────────────
function useAuthNavGuard() {
  const location = useLocation();

  useEffect(() => {
    const { token } = getStoredAuth();
    if (!token) return;

    window.history.pushState({ appGuard: true }, "", window.location.href);

    const handlePopState = () => {
      const { token: t } = getStoredAuth();
      if (t) {
        window.history.pushState({ appGuard: true }, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname]);
}

// ── Login Guard ────────────────────────────────────────────────────────────────
function LoginGuard({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = getStoredAuth();

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (t && u) {
      let home = "/dashboard";
      if (u.role === "developer") home = "/developer/dashboard";
      else if (u.role === "user") home = "/user/dashboard";
      navigate(home, { replace: true });
      return;
    }
    window.history.replaceState(null, "", location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (token && user) return null;
  return children;
}

// ── Role-aware page switches ──────────────────────────────────────────────────
function LeadsRoleSwitch() {
  const { user } = getStoredAuth();
  return user?.role === "user" ? <UserLeadsPage /> : <AdminLeadsPage />;
}

function DailyReportRoleSwitch() {
  const { user } = getStoredAuth();
  return user?.role === "user" ? <UserDailyReport /> : <Dailyreport />;
}

function RootRedirect() {
  const { user } = getStoredAuth();
  if (user?.role === "developer") return <Navigate to="/developer/dashboard" replace />;
  if (user?.role === "user") return <Navigate to="/user/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ── Admin-only Route ───────────────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { token, user } = getStoredAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (!t || !u) {
      navigate("/login", { replace: true });
    } else if (u.role === "user") {
      navigate("/user/dashboard", { replace: true });
    } else if (u.role === "developer") {
      navigate("/developer/dashboard", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === "user") return <Navigate to="/user/dashboard" replace />;
  if (user.role === "developer") return <Navigate to="/developer/dashboard" replace />;
  return children;
}

// ── SuperAdmin-only Route ──────────────────────────────────────────────────────
function SuperAdminRoute({ children }) {
  const { token, user } = getStoredAuth();
  const navigate = useNavigate();

  const isSuperAdmin = (r) => r === "super_admin" || r === "superadmin";

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (!t || !u) {
      navigate("/login", { replace: true });
    } else if (!isSuperAdmin(u.role)) {
      navigate("/dashboard", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── User-only Route ────────────────────────────────────────────────────────────
function UserRoute({ children }) {
  const { token, user } = getStoredAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (!t || !u) {
      navigate("/login", { replace: true });
    } else if (u.role !== "user") {
      navigate("/dashboard", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== "user") return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Developer-only Route ───────────────────────────────────────────────────────
function DeveloperRoute({ children }) {
  const { token, user } = getStoredAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (!t || !u) {
      navigate("/login", { replace: true });
    } else if (u.role !== "developer") {
      navigate("/dashboard", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== "developer") return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Breadcrumb — purely presentational label lookup, no data fetching ────────
const ROUTE_LABELS = {
  dashboard: "Dashboard", leads: "Leads", reportpage: "Report Page",
  campaigns: "Campaigns", communications: "Communications",
  "daily-report": "Daily Report", "nurture-sequence": "Lead Nurture",
  attendance: "Attendance", "custom-reports": "Custom Reports",
  "upgrade-plan": "Upgrade Plan", user: "Employee", developer: "Developer",
  companies: "Companies", subscriptions: "Subscriptions",
  "plan-customization": "Plan Customization", addons: "Add-ons",
  "sheet-integration": "Excel / Google Sheet",
};
function prettifySegment(seg) {
  return ROUTE_LABELS[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return (
    <div className="hidden md:flex items-center gap-1.5 text-[12.5px] min-w-0">
      <span className="text-slate-400 dark:text-slate-500 font-medium">Launcherdesk</span>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
          <span
            className={`truncate ${i === segments.length - 1 ? "text-slate-700 dark:text-slate-200 font-semibold" : "text-slate-400 dark:text-slate-500"}`}
          >
            {prettifySegment(seg)}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Today's date — a small live label, recomputed on an interval so it never
// goes stale across midnight if the tab stays open. No API calls involved. ──
function useTodayLabel() {
  const [label, setLabel] = React.useState(() =>
    new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setLabel(new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

// ── Quick create — real navigation shortcuts to the pages where each object
// is actually created (no fabricated actions, no dead links). ───────────────
function QuickCreateMenu({ role }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isAdmin = role === "admin" || role === "superadmin" || role === "super_admin";
  const items = isAdmin
    ? [
      { label: "Add a lead", hint: "Leads", icon: Users, to: "/leads" },
      { label: "New campaign", hint: "Campaigns", icon: Megaphone, to: "/campaigns" },
      { label: "Send a blast", hint: "Communications", icon: MessageSquare, to: "/communications" },
    ]
    : [
      { label: "Add a lead", hint: "My Leads", icon: Users, to: "/leads" },
    ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-primary btn-sm !px-3"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Create</span>
        <ChevronDown className="w-3 h-3 hidden sm:inline opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 surface-card !rounded-xl shadow-popover overflow-hidden py-1.5 z-40 animate-scale-in origin-top-right">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                onClick={() => { setOpen(false); navigate(it.to); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-[#F3EBFF] dark:bg-[#7E14FF]/15 text-[#7E14FF] dark:text-violet-300 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 text-left">{it.label}</span>
                <span className="text-[11px] text-slate-400">{it.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sticky Company Header ──────────────────────────────────────────────────────
function CompanyHeader() {
  const { user } = getStoredAuth();
  const role = (user?.role || "user").toLowerCase();
  const todayLabel = useTodayLabel();

  const [brand, setBrand] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("company_brand") || "null"); } catch { return null; }
  });

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || role === "developer" || role === "user") return;
    api.get("/admin/company/brand")
      .then((res) => {
        if (res.data) {
          const b = { ...res.data, _ts: Date.now() };
          setBrand(b);
          localStorage.setItem("company_brand", JSON.stringify(b));
        }
      })
      .catch(() => { });
  }, []);

  React.useEffect(() => {
    const handler = () => {
      try { setBrand(JSON.parse(localStorage.getItem("company_brand") || "null")); } catch { }
    };
    window.addEventListener("company_brand_updated", handler);
    return () => window.removeEventListener("company_brand_updated", handler);
  }, []);

  // Render gate AFTER hooks so hook order stays stable across renders.
  if (role === "developer") return null;

  const headerName = brand?.name || brand?.headerName || "LAUNCHERDESK";
  const headerLogo = brand?.logoUrl || brand?.headerLogoUrl || "/launcherdesk_logo.svg";

  const roleLabel =
    role === "super_admin" || role === "superadmin" ? "Super Admin" :
      role === "admin" ? "Admin" : "Employee";

  const roleColor =
    role === "super_admin" || role === "superadmin"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
      : role === "admin"
        ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20"
        : "bg-[#F3EBFF] text-[#6300D6] border-[#D5BDFF] dark:bg-[#7E14FF]/15 dark:text-violet-300 dark:border-[#7E14FF]/30";

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 pl-14 pr-3 sm:pr-6 md:px-6 h-16 bg-white/85 dark:bg-[#181029]/85 backdrop-blur-xl border-b border-[#E7DCFA]/80 dark:border-white/[0.06]">
      {/* ── Left: brand mark + breadcrumb ── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="hidden lg:flex items-center gap-2 min-w-0 shrink-0">
          <img
            src={headerLogo}
            alt={headerName}
            className="h-6 w-auto max-w-[90px] object-contain shrink-0"
            onError={e => { e.currentTarget.src = "/launcherdesk_logo.svg"; }}
          />
          <span className="text-[13px] font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[140px]">
            {headerName}
          </span>
          <span className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />
        </div>
        <Breadcrumb />
      </div>

      {/* ── Right: search / actions / integrations / profile ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Command palette trigger — opens the same Cmd/Ctrl+K palette as the sidebar */}
        <button
          onClick={() => window.dispatchEvent(new Event("open_command_palette"))}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] text-slate-400
            bg-slate-100/70 dark:bg-white/[0.05] border border-transparent hover:border-slate-200 dark:hover:border-white/10
            transition-colors"
          title="Search (Ctrl/Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-slate-400">Search…</span>
          <kbd className="flex items-center gap-0.5 text-[10px] font-semibold border border-slate-300/70 dark:border-white/10 rounded px-1 py-0.5 ml-1">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event("open_command_palette"))}
          className="icon-btn sm:hidden"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <span className="hidden xl:flex items-center gap-1.5 text-[12px] font-medium text-slate-400 dark:text-slate-500 px-2">
          <Calendar className="w-3.5 h-3.5" />
          {todayLabel}
        </span>

        {(role === 'admin' || role === 'superadmin' || role === 'super_admin') && (
          <QuickCreateMenu role={role} />
        )}

        <span className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-0.5 hidden sm:block" />

        <ThemeToggle />
        {/* Notification bell — admin, superadmin, and employees (new-lead alerts) */}
        {(role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'user') && (
          <NotificationBell />
        )}
        {/* Telegram campaign notifications — admin and superadmin only */}
        {(role === 'admin' || role === 'superadmin' || role === 'super_admin') && (
          <TelegramSettings />
        )}
        {/* Daily Telegram Report settings — admin and superadmin only */}
        {(role === 'admin' || role === 'superadmin' || role === 'super_admin') && (
          <DailyReportTelegramSettings />
        )}
        {/* Employee Excel / Google Sheet integration control — admin/superadmin.
            Self-hides unless the feature is available for this company. */}
        {(role === 'admin' || role === 'superadmin' || role === 'super_admin') && (
          <SheetIntegrationAdminSettings />
        )}
        <span className={`whitespace-nowrap shrink-0 ml-0.5 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-1 rounded-full border ${roleColor}`}>
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

// ── Layout with Sidebar ────────────────────────────────────────────────────────
// Changes:
//  1. Added EntitlementStatusBanner — shows persistent read-only indicator
//     at the top of the layout for blocked subscription states.
//  2. EntitlementStatusBanner replaces the duplicate logic that was in
//     ExpiryBanner for read-only states. ExpiryBanner is still kept for
//     "expiring soon" warnings (not blocked yet).
//  3. On plan_updated event: clears entitlement cache so sidebar and
//     feature gates refresh automatically without a page reload.
function AppLayout() {
  const goToPlans = () => { window.location.href = "/upgrade-plan"; };

  // Clear entitlement cache when plan changes (e.g. after developer update)
  // so usePlanFeatures / useEntitlements pick up fresh data on next render.
  React.useEffect(() => {
    const handler = () => clearFeaturesCache();
    window.addEventListener("plan_updated", handler);
    return () => window.removeEventListener("plan_updated", handler);
  }, []);

  return (
    <NotificationProvider>
      <TermsGate>
        <ClockInGate>
          <div className="flex h-screen overflow-hidden bg-gray-2 dark:bg-boxdark-2">
            <Sidebar />
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
              {/* Expiry / suspension banners — ordered from most to least severe */}
              <ExpiryBanner onGoToPlans={goToPlans} />
              {/* EntitlementStatusBanner: persistent read-only indicator
                  (separate from ExpiryBanner's "expiring soon" warning) */}
              <EntitlementStatusBanner onGoToPlans={goToPlans} />
              {/* TrialGate: full-screen prompt to add a payment method (trial_pending)
                  or pick a plan after the trial (auto-charged). Owns all trial states. */}
              <TrialGate />
              <CompanyHeader />
              {/* Outlet — this is the fix. AppLayout (Sidebar, TermsGate, ClockInGate,
                  NotificationProvider, CompanyHeader, banners) now mounts ONCE for the
                  whole authenticated session. Only the routed page below swaps on
                  navigation — it no longer remounts the whole shell and re-fires every
                  API call (attendance check, terms check, trial check, brand fetch,
                  follow-up alerts, unread counts) on every click. */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </div>
            </main>
          </div>
        </ClockInGate>
      </TermsGate>
    </NotificationProvider>
  );
}

// ── Authenticated shell gate ───────────────────────────────────────────────────
// Sits ONE level above AppLayout in the route tree. Confirms the user has a
// token+user before mounting the shell at all, then renders AppLayout once;
// every nested authenticated route below is just an <Outlet/> swap from here
// on, not a fresh mount of Sidebar/Gates/Providers.
function AuthenticatedLayout() {
  const { token, user } = getStoredAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { token: t, user: u } = getStoredAuth();
    if (!t || !u) navigate("/login", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user) return null;
  return <AppLayout />;
}

function UpgradePlanWithMembers(props) {
  const [currentAdmins, setCurrentAdmins] = useState([]);
  const [currentUsers, setCurrentUsers] = useState([]);

  useEffect(() => {
    api.get("/admin/")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.admins ?? []);
        setCurrentAdmins(list);
      })
      .catch(() => { });

    api.get("/admin/company/users")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.users ?? []);
        setCurrentUsers(list);
      })
      .catch(() => { });
  }, []);

  const UpgradePlanComponent = lazy(() => import("./components/UpgradePlan"));
  return (
    <Suspense fallback={null}>
      <UpgradePlanComponent
        {...props}
        currentAdmins={currentAdmins}
        currentUsers={currentUsers}
        // After payment succeeds, clear the entitlement cache so the
        // sidebar and feature gates pick up the new plan immediately.
        onPlanChange={() => {
          clearFeaturesCache();
          window.dispatchEvent(new Event("plan_updated"));
        }}
      />
    </Suspense>
  );
}

// ── Inner app — rendered inside BrowserRouter so hooks work ───────────────────
function AppInner() {
  const { user } = getStoredAuth();

  // Trap logged-in users inside the app — back/forward buttons won't leave.
  useAuthNavGuard();

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Marketing Panel — fully standalone, no CRM auth guards ──── */}
          <Route path="/marketing/login" element={<Suspense fallback={null}><MktLogin /></Suspense>} />
          <Route path="/marketing" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}><MktDashboard /></Suspense>} />

          {/* ── CRM routes ─────────────────────────────────────────────────────── */}

          {/* ── Public login routes ── */}
          <Route path="/login" element={<LoginGuard><UserLogin /></LoginGuard>} />
          <Route path="/forgot-password" element={<LoginGuard><ForgotPassword /></LoginGuard>} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/superadmin/login" element={<LoginGuard><SuperAdminLogin /></LoginGuard>} />

          {/* ── Authenticated shell — mounts ONCE. Every route below is just an
              Outlet swap inside the same Sidebar/Gates/Providers instance. ── */}
          <Route element={<AuthenticatedLayout />}>

            {/* ── Root redirect ── */}
            <Route path="/" element={<RootRedirect />} />

            {/* ── Admin Dashboard ── */}
            <Route path="/dashboard" element={
              <AdminRoute><Dashboard /></AdminRoute>
            } />

            {/* ── User Dashboard ── */}
            <Route path="/user/dashboard" element={
              <UserRoute><UserDashboard /></UserRoute>
            } />

            {/* ── User Communications (own leads only) ── */}
            <Route path="/user/communications" element={
              <UserRoute>
                <FeatureGate anyOf={["sms-blast", "whatsapp-blast", "email-blast"]}>
                  <UserLeadCommunication />
                </FeatureGate>
              </UserRoute>
            } />

            {/* ── User Excel / Google Sheet integration ── */}
            <Route path="/user/sheet-integration" element={
              <UserRoute>
                <FeatureGate featureKey="googleSheetIntegrationEnabled">
                  <UserSheetIntegration />
                </FeatureGate>
              </UserRoute>
            } />

            {/* ── Developer pages ── */}
            <Route path="/developer/dashboard" element={
              <DeveloperRoute><DeveloperDashboard /></DeveloperRoute>
            } />
            <Route path="/developer/companies" element={
              <DeveloperRoute><DeveloperCompanies /></DeveloperRoute>
            } />
            <Route path="/developer/companies/:id" element={
              <DeveloperRoute><DeveloperCompanyDetails /></DeveloperRoute>
            } />
            <Route path="/developer/subscriptions" element={
              <DeveloperRoute><DeveloperSubscriptions /></DeveloperRoute>
            } />
            <Route path="/developer/plan-customization" element={
              <DeveloperRoute><DeveloperPlanCustomization /></DeveloperRoute>
            } />
            <Route path="/developer/addons" element={
              <DeveloperRoute><DeveloperAddonManager /></DeveloperRoute>
            } />

            {/* ── Admin-only pages ── */}
            <Route path="/performance-marketing" element={<PerfMarketing />} />
            <Route path="/reportpage" element={
              <AdminRoute><FeatureGate featureKey="basic-reports"><ReportPage /></FeatureGate></AdminRoute>
            } />
            <Route path="/campaigns" element={
              <AdminRoute><Campaigns /></AdminRoute>
            } />
            <Route path="/attendance" element={
              <AdminRoute><FeatureGate featureKey="attendance"><AttendancePage /></FeatureGate></AdminRoute>
            } />

            {/* ── Upgrade Plan — SuperAdmin only ── */}
            <Route path="/upgrade-plan" element={
              <SuperAdminRoute><UpgradePlanWithMembers /></SuperAdminRoute>
            } />

            {/* ── Custom Reports — SuperAdmin only ── */}
            <Route path="/custom-reports" element={
              <SuperAdminRoute><CustomReports /></SuperAdminRoute>
            } />

            {/* ── Communications ── */}
            <Route path="/communications" element={
              <AdminRoute>
                {/* Communications hosts WhatsApp, SMS, and Email blasts.
                    The whole page is hidden unless at least one blast feature
                    (sms-blast / whatsapp-blast / email-blast) is enabled for
                    this company's plan. Individual send actions are still
                    gated per-tab on the backend (403 if that blast is off). */}
                <FeatureGate anyOf={["sms-blast", "whatsapp-blast", "email-blast"]}>
                  <Communications currentUser={user} />
                </FeatureGate>
              </AdminRoute>
            } />

            {/* ── Leads — role-aware ── */}
            <Route path="/leads" element={<LeadsRoleSwitch />} />

            {/* ── Daily report — role-aware ── */}
            <Route path="/daily-report" element={
              <FeatureGate featureKey="daily-report"><DailyReportRoleSwitch /></FeatureGate>
            } />

            {/* ── Lead nurture sequence — admin only, single-company rollout ── */}
            <Route path="/nurture-sequence" element={
              <AdminRoute><FeatureGate featureKey="leadNurtureSequence"><NurtureSequenceBuilder /></FeatureGate></AdminRoute>
            } />

          </Route>

          {/* ── Legacy redirects ── */}
          <Route path="/whatsapp" element={<Navigate to="/communications" replace />} />
          <Route path="/email-history" element={<Navigate to="/communications" replace />} />

          {/* ── Call recordings redirect to dashboard (page removed) ── */}
          <Route path="/call-recordings" element={<Navigate to="/dashboard" replace />} />

          {/* ── Invoice receipt preview (TEMPORARY — remove when done testing) ── */}
          <Route path="/invoice-test" element={<InvoiceTest />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}