// src/components/admin/AdminLifecycleNav.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Launch → Manage → Grow" — LauncherDesk's own business-lifecycle positioning
// (see website src/data/company.js subTagline + src/data/services.js category
// eyebrows: START/BUILD/MANAGE/GROW/AUTOMATE/EXPAND), reused here purely as an
// information-architecture / navigation element inside the CRM.
//
// This is intentionally content, not data: the sub-items are LauncherDesk's
// real service categories (from the public website), not CRM records. Where a
// sub-item maps to an existing CRM module, it's a real <Link> to that route.
// Where it doesn't (e.g. "GST Filing" — a client-facing service, not a CRM
// feature), it's shown as plain context, not a fake clickable feature.
import { Link } from "react-router-dom";
import { Rocket, Settings2, TrendingUp, ArrowRight } from "lucide-react";

const STAGES = [
  {
    key: "launch",
    title: "Launch",
    icon: Rocket,
    color: "#7E14FF",
    blurb: "Get a business set up right",
    items: [
      { label: "Registrations & GST", to: null },
      { label: "Licences & MSME", to: null },
      { label: "Compliance", to: null },
      { label: "IP Protection", to: null },
    ],
  },
  {
    key: "manage",
    title: "Manage",
    icon: Settings2,
    color: "#4F46E5",
    blurb: "Run day-to-day operations",
    items: [
      { label: "Leads & Pipeline", to: "/leads" },
      { label: "Communications", to: "/communications" },
      { label: "Attendance", to: "/attendance" },
      { label: "Lead Nurture", to: "/nurture-sequence" },
    ],
  },
  {
    key: "grow",
    title: "Grow",
    icon: TrendingUp,
    color: "#059669",
    blurb: "Marketing that compounds",
    items: [
      { label: "Campaigns", to: "/campaigns" },
      { label: "Performance Marketing", to: "/performance-marketing" },
      { label: "Reports & Analytics", to: "/reportpage" },
      { label: "Branding & SEO", to: null },
    ],
  },
];

export default function AdminLifecycleNav() {
  return (
    <div className="surface-card p-4 sm:p-5 mb-5 sm:mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">
            Your business lifecycle
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Launch. Manage. Grow. — everything LauncherDesk does for your business, in one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.key}
              className="rounded-2xl border border-[#E7DCFA]/70 dark:border-white/[0.06] p-3.5 sm:p-4 bg-[#FAF7FF]/70 dark:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${stage.color}1A`, color: stage.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[12.5px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {stage.title}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mb-2.5 pl-9">{stage.blurb}</p>
              <ul className="space-y-1 pl-9">
                {stage.items.map((it) => (
                  <li key={it.label}>
                    {it.to ? (
                      <Link
                        to={it.to}
                        className="group flex items-center gap-1 text-[11.5px] font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                      >
                        {it.label}
                        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    ) : (
                      <span className="text-[11.5px] text-slate-400 dark:text-slate-500">{it.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}