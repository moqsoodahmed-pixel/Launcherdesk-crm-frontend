import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../data/axiosConfig";
import { Pill } from "./ui/Primitives";

/**
 * NotInterestedModal
 * Props:
 *   lead       – full lead object (must have ._id or .id, .name, .mobile, .callHistory)
 *   onClose    – fn() close modal
 *   onSuccess  – fn(updatedLead) called after successful API response
 */
export default function NotInterestedModal({ lead, onClose, onSuccess }) {
  const [remark,  setRemark]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [result,  setResult]  = useState(null);

  if (!lead) return null;

  const leadId  = lead._id || lead.id;
  const history = lead.callHistory || [];

  const now = Date.now();
  const fmt = function(d) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleConfirm = async function() {
    if (!remark.trim()) {
      setError("Please provide a reason / remark before confirming.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/lead/" + leadId + "/not-interested", {
        remark: remark.trim(),
      });
      setResult(res.data);
    } catch (err) {
      setError(
        (err.response && err.response.data && err.response.data.message) ||
        "Failed to update lead. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  const successContent = result && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-fade-in"
      onClick={function(e) { e.stopPropagation(); }}
    >
      <div className="w-full max-w-md surface-card !rounded-2xl shadow-popover overflow-hidden animate-scale-in">
        <div className="px-6 py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">
            {result.isVerification
              ? "Lead Sent for Verification"
              : result.isReturned
                ? "Returned to Original Employee"
                : result.isSecondNI
                  ? "Marked Not Interested"
                  : "Lead Reassigned Successfully"}
          </h2>
          {result.reassignedTo && (
            <p className="text-[13px] text-slate-500">
              {result.isVerification
                ? "Sent to "
                : result.isReturned
                  ? "Returned to "
                  : "Reassigned to "}
              <strong className="text-slate-900 dark:text-white">{result.reassignedTo.name}</strong>
            </p>
          )}
          {result.isVerification && (
            <p className="text-[12px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 rounded-xl px-4 py-2">
              Status set to <strong>Verification</strong>. If the verifier also marks it Not Interested,
              it will come back to you with the remaining follow-ups.
            </p>
          )}
          {result.isReturned && (
            <p className="text-[12px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-2">
              Verification confirmed. The lead is back with the original employee and keeps its remaining follow-ups.
            </p>
          )}
          {(result.scheduledCalls || []).length > 0 && (
            <div className="text-left space-y-2 bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Scheduled Calls</p>
              {(result.scheduledCalls || []).map(function(sc, i) {
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={"w-2 h-2 rounded-full shrink-0 " + (sc.type === "follow-up" ? "bg-cyan-500" : "bg-violet-500")} />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300 capitalize">{sc.type}</span>
                    <span className="ml-auto text-[11px] text-slate-500">{fmt(sc.scheduledAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={function() { onSuccess(result.lead || lead); onClose(); }}
            className="btn-primary btn-md w-full"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  if (result) return createPortal(successContent, document.body);

  // ── Main modal ──────────────────────────────────────────────────────────────
  const mainContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-fade-in"
      onClick={function(e) { e.stopPropagation(); }}
    >
      <div
        className="w-full max-w-lg surface-card !rounded-2xl shadow-popover overflow-hidden animate-scale-in"
        onClick={function(e) { e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Mark as Not Interested</h2>
              <p className="text-[12px] text-slate-500">{lead.name} · {lead.mobile || lead.phone || ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">

          {/* Info banner */}
          <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-semibold">What happens next:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Lead is sent to <strong>another agent for verification</strong></li>
              <li>If the verifier also marks it Not Interested, it comes <strong>back to you</strong> with the remaining follow-ups</li>
              <li> Follow-up call in <strong>3 days</strong> ({fmt(now + 3 * 86400000)})</li>
              <li> Verification call in <strong>7 days</strong> ({fmt(now + 7 * 86400000)})</li>
              <li> Verification call in <strong>30 days</strong> ({fmt(now + 30 * 86400000)})</li>
              <li>Full call history passed to the verifier</li>
            </ul>
          </div>

          {/* Previous call history */}
          {history.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Previous Call History ({history.length})
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                {history.map(function(h, i) {
                  return (
                    <div key={i} className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-slate-900 dark:text-white">{h.userName || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500">{fmt(h.calledAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{h.remark}</p>
                      {h.outcome && (
                        <Pill tone="rose" className="mt-1">
                          {h.outcome}
                        </Pill>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remark input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Reason / Remark <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={remark}
              onChange={function(e) { setRemark(e.target.value); if (error) setError(""); }}
              placeholder="Explain why the lead is not interested..."
              className={`input-field p-3 resize-none ${
                error ? "!border-rose-400 dark:!border-rose-500/60 focus:!ring-rose-500/30 focus:!border-rose-400" : ""
              }`}
            />
            {error && (
              <p className="text-[12px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end bg-slate-50 dark:bg-white/[0.02]">
          <button onClick={onClose} disabled={loading} className="btn-secondary btn-md">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !remark.trim()}
            className="btn-danger btn-md"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            )}
            {loading ? "Processing…" : "Confirm & Reassign"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(mainContent, document.body);
}
