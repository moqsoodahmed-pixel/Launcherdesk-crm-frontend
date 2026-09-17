import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * IdleRemarkModal
 *
 * Props:
 *   open          – boolean — controls visibility
 *   mode          – "recurring" | "resume"
 *                    "recurring" : user is currently idle; just collecting a remark
 *                    "resume"    : user is resuming from idle break; remark required before break/end
 *   idleSince     – ISO string — when the current idle break started
 *   pendingBreaks – array of past Auto Idle breaks whose remarkStatus === "pending"
 *                   each item: { index, startTime, endTime, reason, remark, remarkStatus }
 *   onSave(text)        – save remark for the current idle break
 *   onSkip()            – skip remark for the current idle break
 *   onSavePending(breakIndex, text) – save remark for a past pending break
 */
export default function IdleRemarkModal({
  open,
  mode = "recurring",
  idleSince,
  pendingBreaks = [],
  onSave,
  onSkip,
  onSavePending,
}) {
  const [remark, setRemark] = useState("");
  const [pendingRemarks, setPendingRemarks] = useState({});
  const [savingIndex, setSavingIndex] = useState(null);

  if (!open) return null;

  // ── helpers ────────────────────────────────────────────────────────────────
  function fmtTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function idleDuration() {
    if (!idleSince) return null;
    const mins = Math.floor((Date.now() - new Date(idleSince).getTime()) / 60000);
    if (mins < 1) return "less than a minute";
    if (mins === 1) return "1 minute";
    if (mins < 60) return `${mins} minutes`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (onSave) onSave(remark.trim());
    setRemark("");
  };

  const handleSkip = () => {
    setRemark("");
    if (onSkip) onSkip();
  };

  const handleSavePending = async (breakIndex) => {
    const text = (pendingRemarks[breakIndex] || "").trim();
    setSavingIndex(breakIndex);
    try {
      if (onSavePending) await onSavePending(breakIndex, text);
      setPendingRemarks((prev) => {
        const next = { ...prev };
        delete next[breakIndex];
        return next;
      });
    } finally {
      setSavingIndex(null);
    }
  };

  // ── content ────────────────────────────────────────────────────────────────
  const isResume = mode === "resume";
  const duration = idleDuration();

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#13161E] rounded-3xl shadow-2xl border border-[#E4E7EF] dark:border-[#1E2130] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E4E7EF] dark:border-[#1E2130]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0F1117] dark:text-white leading-tight">
                {isResume ? "Resume from Idle Break" : "Idle Detected"}
              </h2>
              {duration && (
                <p className="text-[12px] text-[#8B92A9] dark:text-[#6B7280] mt-0.5">
                  {isResume
                    ? `You were idle for ${duration}. Add a remark before resuming.`
                    : `You have been idle for ${duration}.`}
                </p>
              )}
              {idleSince && (
                <p className="text-[11px] text-[#8B92A9] dark:text-[#6B7280]">
                  Since {fmtTime(idleSince)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current idle remark */}
        <div className="px-6 py-4 space-y-3">
          <label className="text-[12px] font-semibold text-[#0F1117] dark:text-[#D1D5DB] uppercase tracking-wider">
            Idle Remark <span className="text-[#8B92A9] font-normal normal-case">(optional)</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-[#E4E7EF] dark:border-[#262A38] bg-[#F8F9FC] dark:bg-[#1A1D27] text-[13px] text-[#0F1117] dark:text-white placeholder-[#8B92A9] resize-none p-3 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition"
            rows={3}
            placeholder="What were you doing? (e.g. In a meeting, On a call…)"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-[13px] font-bold transition"
            >
              {isResume ? "Save & Resume" : "Save Remark"}
            </button>
            {!isResume && (
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 rounded-xl border border-[#E4E7EF] dark:border-[#262A38] text-[#8B92A9] hover:text-[#0F1117] dark:hover:text-white text-[13px] font-semibold transition"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Past pending breaks */}
        {pendingBreaks.length > 0 && (
          <div className="px-6 pb-6 space-y-3 border-t border-[#E4E7EF] dark:border-[#1E2130] pt-4">
            <p className="text-[12px] font-semibold text-[#8B92A9] dark:text-[#6B7280] uppercase tracking-wider">
              Previous idle breaks — add remarks
            </p>
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {pendingBreaks.map((b) => (
                <div
                  key={b.index}
                  className="rounded-xl border border-[#E4E7EF] dark:border-[#262A38] bg-[#F8F9FC] dark:bg-[#1A1D27] p-3 space-y-2"
                >
                  <p className="text-[11px] text-[#8B92A9]">
                    {fmtTime(b.startTime)} → {fmtTime(b.endTime)}
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Add remark…"
                      className="flex-1 rounded-lg border border-[#E4E7EF] dark:border-[#262A38] bg-white dark:bg-[#13161E] text-[12px] text-[#0F1117] dark:text-white placeholder-[#8B92A9] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition"
                      value={pendingRemarks[b.index] || ""}
                      onChange={(e) =>
                        setPendingRemarks((prev) => ({ ...prev, [b.index]: e.target.value }))
                      }
                    />
                    <button
                      onClick={() => handleSavePending(b.index)}
                      disabled={savingIndex === b.index}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-[12px] font-bold transition whitespace-nowrap"
                    >
                      {savingIndex === b.index ? "…" : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}