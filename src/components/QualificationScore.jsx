// components/QualificationScore.jsx
// Shared display for Meta lead-qualification scoring.
// Shows: Lead Score, Maximum Score, Qualification Percentage, Lead Category.
//
// Scoring model (kept in sync with backend utils/qualificationScorer.js):
//   • Each question's answer options total exactly 100 points.
//   • Maximum Score = number of questions × 100.
//   • Percentage = (leadScore / maxScore) × 100.
import { Flame, Thermometer, Snowflake } from "lucide-react";
import { Pill } from "./ui/Primitives";

// Hot/Warm/Cold mapped onto the shared Pill tone palette (rose/amber/cyan) so
// qualification badges read consistently with the rest of the app.
const CAT_TONE = {
  Hot:  "rose",
  Warm: "amber",
  Cold: "cyan",
};
const CAT_COLOR = {
  Hot:  "#E11D48", // rose-600
  Warm: "#D97706", // amber-600
  Cold: "#0891B2", // cyan-600
};
const CAT_BG = {
  Hot:  "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
  Warm: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  Cold: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20",
};
const CAT_ICON = { Hot: Flame, Warm: Thermometer, Cold: Snowflake };

/**
 * Derive the four display values from a lead object, tolerant of older leads
 * that may be missing maxScore / qualificationPercentage.
 *
 * Inference priority for maxScore:
 *   1. lead.maxScore (stored directly)
 *   2. qualificationBreakdown.length × 100 (inferred from breakdown)
 *
 * Inference priority for percentage:
 *   1. lead.qualificationPercentage (stored directly)
 *   2. (leadScore / maxScore) × 100 (computed on the fly)
 */
export function deriveQualification(lead = {}) {
  if (lead.leadScore == null) return null;

  const leadScore = Number(lead.leadScore) || 0;

  // Infer maxScore from breakdown length if not stored
  let maxScore = lead.maxScore != null ? Number(lead.maxScore) || 0 : null;
  if ((maxScore == null || maxScore === 0) && Array.isArray(lead.qualificationBreakdown) && lead.qualificationBreakdown.length > 0) {
    maxScore = lead.qualificationBreakdown.length * 100;
  }

  // Infer percentage
  let percentage = lead.qualificationPercentage != null
    ? Number(lead.qualificationPercentage)
    : maxScore && maxScore > 0
      ? Math.round((leadScore / maxScore) * 10000) / 100
      : null;

  // Clamp to [0, 100] — guards against data corruption
  if (percentage != null) percentage = Math.min(100, Math.max(0, percentage));

  const category = lead.leadCategory || lead.temperature || lead.Quality || null;
  return { leadScore, maxScore, percentage, category };
}

/**
 * Compact inline qualification score badge.
 * Props:
 *   lead         – lead object
 *   size         – "sm" (default) | "md"
 *   showCategory – include the Hot/Warm/Cold label (default true)
 *   variant      – "inline" (default) | "badge" (pill with background)
 */
export default function QualificationScore({
  lead,
  size = "sm",
  showCategory = true,
  variant = "inline",
}) {
  const q = deriveQualification(lead);
  if (!q) return null;

  const color  = CAT_COLOR[q.category] || "#7E14FF";
  const Icon   = CAT_ICON[q.category];
  const numCls = size === "md" ? "text-[13px]" : "text-[11px]";
  const lblCls = size === "md" ? "text-[11px]" : "text-[10px]";

  if (variant === "badge") {
    const bgCls = CAT_BG[q.category] || CAT_BG.Cold;
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${bgCls}`}>
        {showCategory && Icon && (
          <Icon className="w-3 h-3 shrink-0" style={{ color }} />
        )}
        <span className={`${numCls} font-bold tabular-nums`} style={{ color }}>
          {q.leadScore}{q.maxScore != null ? `/${q.maxScore}` : ""}
        </span>
        {q.percentage != null && (
          <span className={`${lblCls} font-semibold`} style={{ color }}>
            {q.percentage}%
          </span>
        )}
        {showCategory && q.category && (
          <span className={`${lblCls} font-semibold`} style={{ color }}>
            {q.category}
          </span>
        )}
      </div>
    );
  }

  // Default inline variant
  return (
    <div className="inline-flex items-center flex-wrap gap-x-2.5 gap-y-1">
      <span className={`${lblCls} text-slate-400`}>
        Score:{" "}
        <span className={`${numCls} font-bold`} style={{ color }}>
          {q.leadScore}
        </span>
        {q.maxScore != null && (
          <span className={`${lblCls} text-slate-400 font-medium`}> / {q.maxScore}</span>
        )}
      </span>
      {q.percentage != null && (
        <span className={`${lblCls} text-slate-400`}>
          (
          <span className={`${numCls} font-bold`} style={{ color }}>
            {q.percentage}%
          </span>
          )
        </span>
      )}
      {showCategory && q.category && (
        <Pill tone={CAT_TONE[q.category] || "slate"} icon={Icon} className={lblCls}>
          {q.category} Lead
        </Pill>
      )}
    </div>
  );
}
