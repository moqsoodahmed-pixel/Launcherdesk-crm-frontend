// components/AISummaryPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable AI performance summary + suggestions panel.
// Handles all three field shapes:
//   Meta Ads   → summary, topPerformers[{campaign,why}], underperformers[{campaign,issue}], suggestions[]
//   Google Ads → summary, topCampaigns[{name,why}], problems[], recommendations[], expectedImpact, priority
//   Website    → summary, problems[], recommendations[], expectedImpact, priority
//
// Usage:
//   <AISummaryPanel
//     analysis={data.aiAnalysis}      // the AI object (or null)
//     error={data.aiAnalysisError}     // string error (or null)
//     loading={aiLoading}              // bool
//     cached={data.aiFromCache}        // bool (optional)
//     onRegenerate={generateAI}        // () => void
//     source="meta" | "google" | "website"
//   />
// ─────────────────────────────────────────────────────────────────────────────
import { Sparkles, Lightbulb, AlertTriangle, TrendingUp,
         Loader2, RefreshCw, AlertCircle, Star, Zap } from "lucide-react";
import { Pill } from "./ui/Primitives";

const PRIORITY_TONE = {
  High:   "rose",
  Medium: "amber",
  Low:    "emerald",
};

function SuggestionList({ items, icon: Icon, label, iconClass, bgClass, borderClass, textClass }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className={`rounded-xl border p-4 ${bgClass} ${borderClass}`}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>{label}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => {
          if (typeof item === "string") {
            return (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-white/60 dark:bg-black/20 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-current/20">{i + 1}</span>
                {item}
              </li>
            );
          }
          // object: {campaign/name, why/issue/reason}
          const title = item.campaign || item.name || "";
          const desc  = item.why || item.issue || item.reason || "";
          return (
            <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300">
              {title && <span className="font-semibold text-slate-900 dark:text-white">{title}: </span>}
              {desc}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AISummaryPanel({ analysis, error, loading, cached, onRegenerate, source = "meta" }) {
  const isEmpty = !analysis && !error && !loading;

  return (
    <div className="surface-card overflow-hidden">
      {/* Header — subtle violet tint signals "AI-generated" content */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-violet-50/60 dark:bg-violet-500/5">
        <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">AI Summary &amp; Suggestions</p>
          <p className="text-[10px] text-slate-400">Auto-generated from your {source === "meta" ? "Meta Ads" : source === "google" ? "Google Ads" : "website"} data</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {cached && (
            <Pill tone="violet">Cached</Pill>
          )}
          {analysis && analysis.priority && (
            <Pill tone={PRIORITY_TONE[analysis.priority] || PRIORITY_TONE.Medium}>
              {analysis.priority} priority
            </Pill>
          )}
          {onRegenerate && (
            <button onClick={onRegenerate} disabled={loading} className="btn-primary btn-sm">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {analysis ? "Regenerate" : "Generate"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-launcher-600 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Analysing your data…</p>
              <p className="text-[11px] text-slate-400 mt-0.5">This takes about 10–20 seconds</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">{error}</p>
          </div>
        )}

        {/* Empty (no analysis yet, not loading) */}
        {!loading && !error && isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6 text-launcher-400" />
            </div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">No analysis yet</p>
            <p className="text-[12px] text-slate-400">Click Generate above to get AI-powered insights and suggestions.</p>
          </div>
        )}

        {/* Analysis */}
        {!loading && analysis && (
          <div className="space-y-4">
            {/* Summary */}
            {analysis.summary && (
              <div className="rounded-xl bg-violet-50/50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/15 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-3.5 h-3.5 text-launcher-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-launcher-700 dark:text-launcher-400">Summary</span>
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Two-col: top performers + underperformers / problems */}
            <div className="grid md:grid-cols-2 gap-3">
              <SuggestionList
                items={analysis.topPerformers || analysis.topCampaigns}
                icon={TrendingUp} label="Top Performers"
                iconClass="text-emerald-600" textClass="text-emerald-700 dark:text-emerald-400"
                bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                borderClass="border-emerald-200 dark:border-emerald-500/20"
              />
              <SuggestionList
                items={analysis.underperformers || analysis.problems}
                icon={AlertCircle} label="Needs Attention"
                iconClass="text-rose-600" textClass="text-rose-700 dark:text-rose-400"
                bgClass="bg-rose-50 dark:bg-rose-500/10"
                borderClass="border-rose-200 dark:border-rose-500/20"
              />
            </div>

            {/* Suggestions / recommendations */}
            <SuggestionList
              items={analysis.suggestions || analysis.recommendations}
              icon={Lightbulb} label="Improvement Suggestions"
              iconClass="text-amber-500" textClass="text-slate-400"
              bgClass="bg-amber-50/60 dark:bg-amber-500/5"
              borderClass="border-amber-200 dark:border-amber-500/15"
            />

            {/* Expected impact */}
            {analysis.expectedImpact && (
              <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                <Zap className="w-4 h-4 text-launcher-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Expected Impact</span>
                  <span className="text-[12px] text-slate-600 dark:text-slate-300">{analysis.expectedImpact}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
