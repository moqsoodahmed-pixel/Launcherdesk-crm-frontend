// src/components/admin/AdminFollowUpIntelligence.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Follow-up Command Center" — computed entirely client-side from the leads
// already loaded into Dashboard's state (each lead carries a real
// `followUpDate` field from the backend Lead model — see models/Leads.js).
// No new API call: this reuses data the dashboard fetches anyway, per the
// "don't fetch the same data twice" guidance.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, AlertTriangle, CalendarClock, ArrowRight } from "lucide-react";

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export default function AdminFollowUpIntelligence({ leads = [] }) {
  const navigate = useNavigate();

  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

    let overdue = 0, today = 0, upcoming = 0;
    for (const l of leads) {
      if (!l.followUpDate) continue;
      // Closed/converted leads don't need a follow-up nudge on this widget.
      if (l.status === "Converted" || l.status === "Not Interested") continue;
      const d = new Date(l.followUpDate);
      if (isNaN(d)) continue;
      if (d < todayStart) overdue++;
      else if (d >= todayStart && d <= todayEnd) today++;
      else if (d > todayEnd && d <= weekEnd) upcoming++;
    }
    return { overdue, today, upcoming };
  }, [leads]);

  const cards = [
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "#DC2626", bg: "bg-red-50 dark:bg-red-500/10" },
    { label: "Due today", value: today, icon: AlarmClock, color: "#D97706", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Upcoming (7 days)", value: upcoming, icon: CalendarClock, color: "#4F46E5", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  ];

  return (
    <div className="surface-card surface-card-hover p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">
          Follow-up command center
        </h2>
        <button
          onClick={() => navigate("/leads")}
          className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300 hover:underline"
        >
          View leads <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => navigate("/leads")}
              className={`${c.bg} rounded-xl p-2.5 sm:p-3 text-left transition-transform hover:-translate-y-0.5`}
            >
              <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color: c.color }} />
              <div className="text-[16px] sm:text-[18px] font-bold text-slate-900 dark:text-white tabular-nums leading-none">
                {c.value}
              </div>
              <div className="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {c.label}
              </div>
            </button>
          );
        })}
      </div>
      {overdue === 0 && today === 0 && upcoming === 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-3">
          No follow-ups scheduled in the loaded lead set.
        </p>
      )}
    </div>
  );
}