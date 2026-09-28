// src/components/admin/AdminMarketingOverview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Top campaigns are computed from the `campaign` field already present on each
// loaded lead (same pattern the dashboard already uses for `sourceStats`) —
// no new API call. Google Ads / Meta spend metrics live in their own connected
// dashboards (GoogleAdsDashboard, PerformanceMarketingDashboard) which pull
// from OAuth-connected ad accounts; duplicating that fetch here isn't done —
// instead this links straight through to those existing, fully-featured pages.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, ArrowRight, TrendingUp } from "lucide-react";
import { Pill } from "../ui/Primitives.jsx";

export default function AdminMarketingOverview({ leads = [] }) {
  const navigate = useNavigate();

  const topCampaigns = useMemo(() => {
    const map = new Map();
    for (const l of leads) {
      const c = (l.campaign || "").trim();
      if (!c || c === "—") continue;
      if (!map.has(c)) map.set(c, { name: c, leads: 0, converted: 0 });
      const row = map.get(c);
      row.leads++;
      if (l.status === "Converted") row.converted++;
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads).slice(0, 5);
  }, [leads]);

  return (
    <div className="surface-card surface-card-hover p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">
          Marketing performance
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/campaigns")}
            className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300 hover:underline"
          >
            Campaigns <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate("/performance-marketing")}
            className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300 hover:underline"
          >
            Ads dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {topCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-[12px] text-slate-500 dark:text-slate-400">
          <Megaphone className="w-6 h-6 opacity-40" />
          No campaign-tagged leads yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {topCampaigns.map((c) => {
            const rate = c.leads > 0 ? Math.round((c.converted / c.leads) * 100) : 0;
            return (
              <div key={c.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3 h-3 text-violet-500" />
                  </span>
                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{c.leads} leads</span>
                  <Pill tone="emerald" className="!py-0.5">{rate}% conv.</Pill>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/10">
        Google Ads and Meta spend/CPL metrics are available in the Ads dashboard for connected accounts.
      </p>
    </div>
  );
}