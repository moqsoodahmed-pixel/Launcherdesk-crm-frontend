import { useState, useEffect, useCallback } from "react";
import api from "../data/axiosConfig";
import {
  AlertTriangle, TrendingDown, Sparkles, Lightbulb,
  Users, Megaphone, Loader2, FileDown, Target,
} from "lucide-react";
import { Pill } from "./ui/Primitives";

// ─────────────────────────────────────────────────────────────────────────────
// Non-Conversion (Lost Lead) Analysis
// Admin report: why leads didn't convert + AI improvement suggestions.
// ─────────────────────────────────────────────────────────────────────────────

// Reason-breakdown bar colors — categorical data-visualization palette (plain
// divs standing in for a chart), not UI chrome, so left as literal hex rather
// than Tailwind utility classes (no chart-palette token is defined yet).
const BAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#EF4444", "#14B8A6", "#A855F7", "#64748B",
];

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

const ACCT_STYLE = {
  "Agent follow-up gap": "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "Awaiting next step":  "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  "Lead not interested": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "Price/budget":        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "Bad lead data":       "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "Product/fit":         "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "No data":             "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
function acctCls(label) { return ACCT_STYLE[label] || ACCT_STYLE["No data"]; }
// Pill tone equivalent of ACCT_STYLE, for table/badge usages that render via <Pill>.
const ACCT_TONE = {
  "Agent follow-up gap": "rose",
  "Awaiting next step":  "cyan",
  "Lead not interested": "slate",
  "Price/budget":        "amber",
  "Bad lead data":       "amber",
  "Product/fit":         "violet",
  "No data":             "slate",
};

export default function NonConversionReport() {
  const [from, setFrom]           = useState(isoDaysAgo(30));
  const [to, setTo]               = useState(isoDaysAgo(0));
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async (withAI = false) => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/reports/non-conversion", {
        params: { from, to, ai: withAI ? "true" : "false" },
      });
      setData(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const generateAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data } = await api.get("/reports/non-conversion", {
        params: { from, to, ai: "true" },
      });
      setData(data);
    } catch (e) {
      setError(e?.response?.data?.message || "AI report failed.");
    } finally {
      setAiLoading(false);
    }
  }, [from, to]);

  // Auto-reload whenever dates change (and on mount). No manual Run Report needed.
  useEffect(() => { load(false); }, [from, to]); // eslint-disable-line

  const exportPDF = () => window.print();
  const maxCount = data?.reasonBreakdown?.[0]?.count || 1;

  return (
    <div className="print-area">
      <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; } .no-print { display: none !important; } }`}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#181029] no-print">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">

          {/* Title */}
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient shadow-glow-brand flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">Non-Conversion Analysis</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Why leads didn't convert — with AI-powered improvement suggestions</p>
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
            <div className="flex flex-col">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                aria-label="From date"
                className="text-[12px] font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer w-[120px]" />
            </div>
            <span className="text-slate-300 dark:text-slate-600 text-xs px-1">→</span>
            <div className="flex flex-col">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                aria-label="To date"
                className="text-[12px] font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer w-[120px]" />
            </div>
            {loading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin ml-1 shrink-0" />}
          </div>

          {/* Generate AI */}
          <button onClick={generateAI} disabled={aiLoading || loading} className="btn-primary btn-md shrink-0">
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiLoading ? "Generating…" : data?.aiAnalysis ? "Re-generate AI" : "Generate AI Report"}
          </button>

          {/* Export PDF */}
          <button onClick={exportPDF} disabled={!data} className="btn-secondary btn-md shrink-0">
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-[13px] font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-48" />
          </div>
        )}

        {data && (
          <>
            {/* ── Summary hero card ──────────────────────────────────────── */}
            <div className="surface-card px-6 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-2"><span className="text-[30px] font-bold text-slate-900 dark:text-white leading-none">{data.totalLost}</span><span className="text-[13px] text-slate-400">non-converted leads in this period</span></div>

              </div>
            </div>

            {data.totalLost === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 surface-card">
                <span className="text-3xl">🎉</span>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">No lost leads this period!</p>
                <p className="text-[12px] text-slate-400">Every lead in this range has converted.</p>
              </div>
            ) : (
              <>
                {/* ── Where the issue lies ───────────────────────────────── */}
                {Array.isArray(data.accountabilityBreakdown) && data.accountabilityBreakdown.length > 0 && (
                  <div className="surface-card p-5">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Where the issue lies</h2>
                    <div className="flex flex-wrap gap-2">
                      {data.accountabilityBreakdown.map((a) => (
                        <div key={a.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${acctCls(a.label)}`}>
                          <span className="text-[15px] font-bold">{a.count}</span>
                          <span className="text-[11px] font-semibold">{a.label}</span>
                          <span className="text-[10px] opacity-70">({a.percent}%)</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-3 italic leading-relaxed">
                      "Agent follow-up gap" = a lead the team should have acted on. AI inference from logged notes — not a definitive verdict.
                    </p>
                  </div>
                )}

                {/* ── Reason breakdown ──────────────────────────────────── */}
                <div className="surface-card p-5">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Reason Breakdown</h2>
                  <div className="space-y-3">
                    {data.reasonBreakdown.map((r, i) => (
                      <div key={r.reason}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-semibold text-slate-900 dark:text-white">{r.reason}</span>
                          <span className="text-[11px] text-slate-400 font-semibold">{r.count} · {r.percent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${(r.count / maxCount) * 100}%`,
                            background: BAR_COLORS[i % BAR_COLORS.length],
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── AI analysis panel ─────────────────────────────────── */}
                <div className="surface-card overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20">
                    <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white">AI Analysis & Improvement Suggestions</span>
                  </div>
                  <div className="p-5">
                    {data.aiAnalysisError ? (
                      <div className="flex items-center gap-2 text-[13px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {data.aiAnalysisError}
                      </div>
                    ) : data.aiAnalysis ? (
                      <div className="space-y-4">
                        {data.aiAnalysis.summary && (
                          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-indigo-400 pl-3">
                            {data.aiAnalysis.summary}
                          </p>
                        )}
                        {Array.isArray(data.aiAnalysis.topReasons) && data.aiAnalysis.topReasons.length > 0 && (
                          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Key Patterns</p>
                            <ul className="space-y-2">
                              {data.aiAnalysis.topReasons.map((t, i) => (
                                <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300">
                                  <span className="font-semibold text-slate-900 dark:text-white">{t.reason}:</span> {t.insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(data.aiAnalysis.suggestions) && data.aiAnalysis.suggestions.length > 0 && (
                          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-1.5 mb-3">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggestions</span>
                            </div>
                            <ul className="space-y-2">
                              {data.aiAnalysis.suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-[12px] text-slate-600 dark:text-slate-300">
                                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {data.aiAnalysis.dataQualityNote && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">{data.aiAnalysis.dataQualityNote}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                        <Sparkles className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        <p className="text-[13px] text-slate-400">No AI analysis yet.</p>
                        <p className="text-[12px] text-slate-300 dark:text-slate-600">Click "Generate AI Report" above to run it.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── By Source + By Agent ──────────────────────────────── */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="surface-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Megaphone className="w-3.5 h-3.5 text-slate-400" />
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lost by Source</h3>
                    </div>
                    <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/10">
                      {Object.entries(data.bySource || {}).map(([src, reasons]) => {
                        const totalSrc = Object.values(reasons).reduce((a, b) => a + b, 0);
                        return (
                          <div key={src} className="flex items-center justify-between py-2.5">
                            <span className="text-[12px] font-medium text-slate-900 dark:text-white">{src}</span>
                            <span className="text-[12px] font-bold text-slate-400">{totalSrc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="surface-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lost by Agent</h3>
                    </div>
                    <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/10">
                      {(data.byAgent || []).map((a) => (
                        <div key={a.agent} className="flex items-center justify-between py-2.5">
                          <span className="text-[12px] font-medium text-slate-900 dark:text-white">{a.agent}</span>
                          <span className="text-[12px] font-bold text-slate-400">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Lead details table ────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Lead Details
                    </h2>
                    <Pill tone="slate">{data.leadDetails?.length || 0} leads</Pill>
                  </div>
                  <div className="surface-card overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
                      <table className="w-full text-sm table-fixed min-w-[760px]">
                        <colgroup>
                          <col style={{ width: "13%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "14%" }} />
                          <col style={{ width: "16%" }} />
                          <col style={{ width: "17%" }} />
                          <col style={{ width: "9%"  }} />
                          <col style={{ width: "9%"  }} />
                          <col style={{ width: "12%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
                            {["Lead", "Status", "Reason", "Accountability", "Improvement", "Source", "Agent", "Detail"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                          {(data.leadDetails || []).map((l) => (
                            <tr key={l.leadId} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition align-top">
                              <td className="px-4 py-3 font-semibold text-[12px] text-slate-900 dark:text-white break-words">{l.name}</td>
                              <td className="px-4 py-3 break-words">
                                <span className="text-[11px] text-slate-400">{l.status}</span>
                                {l.temperature && (
                                  <Pill className="ml-1" tone={l.temperature === "Hot" ? "rose" : l.temperature === "Warm" ? "amber" : "cyan"}>{l.temperature}</Pill>
                                )}
                              </td>
                              <td className="px-4 py-3 break-words">
                                <Pill tone="brand">{l.reason}</Pill>
                              </td>
                              <td className="px-4 py-3 break-words">
                                <Pill tone={ACCT_TONE[l.accountability] || "slate"}>{l.accountability || "—"}</Pill>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-emerald-600 dark:text-emerald-400 break-words">
                                {l.improvement || <span className="italic text-slate-300 dark:text-slate-600">—</span>}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-400 break-words">{l.source}</td>
                              <td className="px-4 py-3 text-[11px] text-slate-400 break-words">{l.agent}</td>
                              <td className="px-4 py-3 text-[11px] text-slate-400 break-words">
                                {l.detail || <span className="italic text-slate-300 dark:text-slate-600">No remark</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
