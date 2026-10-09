// src/components/TermsViewerModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Read-only Terms & Conditions viewer. Opened from a link (e.g. the "Terms &
// Conditions" link under the Billing & Plans page). Unlike TermsGate, this does
// NOT block the app and does NOT record acceptance — it simply displays the
// current published terms for reference.
//
// It fetches the same /terms/current endpoint the acceptance gate uses, so the
// content shown here always matches the version users actually accept.
//
// Heading + body render inline in one paragraph with the same font size/weight,
// matching the gate's formatting.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import api from "../data/axiosConfig";

export default function TermsViewerModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(false);
    api
      .get("/terms/current")
      .then(({ data }) => {
        if (!active) return;
        setTerms(data?.terms || null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl max-h-[90vh] flex-col surface-card !rounded-2xl shadow-popover overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {terms?.title || "Terms & Conditions"}
            </h2>
            {terms?.effectiveDate ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Effective Date: {terms.effectiveDate}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0 -mr-1 -mt-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-7 py-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin w-6 h-6 text-launcher-600" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-slate-400">
              Could not load the Terms &amp; Conditions. Please try again later.
            </p>
          ) : !terms ? (
            <p className="py-10 text-center text-slate-400">
              No Terms &amp; Conditions have been published yet.
            </p>
          ) : (
            <>
              {terms.intro ? <p>{terms.intro}</p> : null}
              {(terms.sections || []).map((sec, i) => (
                <p key={i}>
                  {sec.heading ? sec.heading + " " : ""}{sec.body || ""}
                </p>
              ))}
              <div className="pt-2 text-center text-[11px] text-slate-400">
                — End of Terms &amp; Conditions —
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary btn-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
