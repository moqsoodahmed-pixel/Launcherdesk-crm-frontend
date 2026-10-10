import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../data/axiosConfig";
import { fetchAll, getRole } from "../data/dataService";
import { STATUS_CONFIG } from "../utils/statusConfig";
import { Kanban, RefreshCw, AlertTriangle, Clock, GripVertical } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline / Bottleneck Board  (pain points #34 real-time pipeline, #44 bottlenecks)
//
// Kanban board of leads by stage. Drag a card to another column to change its
// status (persists via the existing PUT /lead/(admin|superadmin)/:id endpoint).
// Each card shows AGE IN STAGE (days since last update) with a colour that turns
// amber/red as a lead stalls — so bottlenecks are visible at a glance.
//
// Frontend-only: no new backend. Uses native HTML5 drag-and-drop (no new deps).
// ─────────────────────────────────────────────────────────────────────────────

// Active pipeline stages shown as columns (terminal states handled separately).
const STAGES = ["New", "In Progress", "Verification", "Converted"];

// Lead-aging thresholds (days in current stage) → colour signal for bottlenecks.
const AGE_OK = 2;    // ≤2 days: fine
const AGE_WARN = 5;  // 3-5 days: amber; >5: red

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d)) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function ageColor(days) {
  if (days > AGE_WARN) return { dot: "#E11D48", text: "text-rose-600 dark:text-rose-400", label: "stalled" };
  if (days > AGE_OK)   return { dot: "#D97706", text: "text-amber-600 dark:text-amber-400", label: "aging" };
  return { dot: "#059669", text: "text-emerald-600 dark:text-emerald-400", label: "fresh" };
}

export default function PipelineBoard() {
  const role = getRole();
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [dragId, setDragId]   = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const all = await fetchAll();
      const list = Array.isArray(all) ? all : (all?.leads || []);
      // Only active leads (exclude merged/closed terminal records)
      setLeads(list.filter((l) => !l.mergedInto && !l.isClosed));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group leads by stage.
  const byStage = useMemo(() => {
    const g = Object.fromEntries(STAGES.map((s) => [s, []]));
    for (const l of leads) {
      const s = STAGES.includes(l.status) ? l.status : "New";
      g[s].push(l);
    }
    // Sort each column oldest-first so stalled leads surface at the top.
    for (const s of STAGES) {
      g[s].sort((a, b) => daysSince(b.updatedAt || b.date) - daysSince(a.updatedAt || a.date));
    }
    return g;
  }, [leads]);

  // Drag handlers
  const onDragStart = (id) => setDragId(id);
  const onDragEnd   = () => setDragId(null);

  const onDrop = async (stage) => {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const lead = leads.find((l) => (l._id || l.id) === id);
    if (!lead || lead.status === stage) return;

    // Optimistic update
    const prev = lead.status;
    setLeads((ls) => ls.map((l) => ((l._id || l.id) === id ? { ...l, status: stage, updatedAt: new Date().toISOString() } : l)));
    setSavingId(id);
    try {
      if (role === "superadmin") {
        await api.put(`/lead/superadmin/${id}`, { status: stage });
      } else if (role === "admin") {
        await api.put(`/lead/admin/${id}`, { status: stage });
      } else {
        // PATCH /lead/:id accepts a status-only update
        await api.patch(`/lead/${id}`, { status: stage });
      }
    } catch (e) {
      // Revert on failure
      setLeads((ls) => ls.map((l) => ((l._id || l.id) === id ? { ...l, status: prev } : l)));
      setError("Could not move lead — change reverted.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen ld-canvas">
      <div className="p-4 md:p-6">

        {/* Page header */}
        <div className="ld-hero rounded-3xl px-5 sm:px-7 py-5 sm:py-6 text-white flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Kanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">Pipeline Board</h1>
              <p className="text-xs text-white/75">Drag a lead to change its stage. Card colour shows how long it has been stuck.</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm !bg-white/15 !text-white !border-white/20 hover:!bg-white/25"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[13px]">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const cfg = STATUS_CONFIG[stage] || STATUS_CONFIG.New;
            const items = byStage[stage] || [];
            const stalled = items.filter((l) => daysSince(l.updatedAt || l.date) > AGE_WARN).length;
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(stage)}
                className="surface-card p-2.5 min-h-[220px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-2 py-2 mb-1 sticky top-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white">{stage}</span>
                    <span className="text-[11px] text-slate-500">({items.length})</span>
                  </div>
                  {stalled > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      {stalled} stalled
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2 px-0.5 pb-0.5">
                  {items.map((l) => {
                    const id = l._id || l.id;
                    const age = daysSince(l.updatedAt || l.date);
                    const ac = ageColor(age);
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => onDragStart(id)}
                        onDragEnd={onDragEnd}
                        className={`group surface-card surface-card-hover !rounded-xl p-3 cursor-grab active:cursor-grabbing transition-opacity
                          ${dragId === id ? "opacity-50" : ""}
                          ${savingId === id ? "ring-2 ring-violet-400" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{l.name || "Unknown"}</div>
                            <div className="text-[11.5px] text-slate-500 truncate">{l.campaign || l.source || "—"}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Clock className="w-3 h-3" style={{ color: ac.dot }} />
                              <span className={`text-[11px] font-semibold ${ac.text}`}>
                                {age === 0 ? "today" : `${age}d in stage`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-center text-[12px] text-slate-500 py-8">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
