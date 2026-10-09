// ─────────────────────────────────────────────────────────────────────────────
//  UpdatePaymentModal.jsx
//
//  USAGE:
//    import UpdatePaymentModal from "./UpdatePaymentModal";
//
//    <UpdatePaymentModal
//      currentMethod={subscription.paymentMethod}   // e.g. "Visa •••• 4242"
//      onSave={(method) => setSubscription(prev => ({...prev, paymentMethod: method}))}
//      onClose={() => setShowUpdatePayment(false)}
//    />
//
//  Props:
//    currentMethod  string   — displayed masked method currently on file
//    onSave         fn(str)  — called with new masked method string on success
//    onClose        fn       — called to dismiss the modal
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Loader2, CheckCircle2, X, ShieldCheck } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const formatCard   = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (v) => {
  const c = v.replace(/\D/g, "").slice(0, 4);
  return c.length >= 3 ? c.slice(0, 2) + "/" + c.slice(2) : c;
};
const maskCard = (num) => {
  const d = num.replace(/\s/g, "");
  return `•••• ${d.slice(-4)}`;
};
const detectNetwork = (num) => {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^(508[5-9]|6069|607|608|6521|6522)/.test(d)) return "RuPay";
  return "Card";
};

const INPUT = "input-field px-3 py-2.5 mt-1";

// ─────────────────────────────────────────────────────────────────────────────
export default function UpdatePaymentModal({ currentMethod, onSave, onClose }) {
  const [tab, setTab] = useState("card");
  const [step, setStep] = useState("form"); // "form" | "saving" | "success"

  // card
  const [name, setName]         = useState("");
  const [cardNum, setCardNum]   = useState("");
  const [expiry, setExpiry]     = useState("");
  const [cvv, setCvv]           = useState("");

  // upi
  const [upiId, setUpiId]       = useState("");
  const [upiVerified, setUpiVerified] = useState(null);

  // bank
  const [accName, setAccName]   = useState("");
  const [accNum, setAccNum]     = useState("");
  const [ifsc, setIfsc]         = useState("");
  const [bankName, setBankName] = useState("");

  const [error, setError] = useState("");
  const [savedMethod, setSavedMethod] = useState("");

  // ── validation + submit ────────────────────────────────────────────────
  function handleSave() {
    setError("");
    let methodLabel = "";

    if (tab === "card") {
      if (!name.trim())                              return setError("Enter cardholder name.");
      if (cardNum.replace(/\s/g, "").length < 16)   return setError("Enter a valid 16-digit card number.");
      if (expiry.length < 5)                         return setError("Enter expiry in MM/YY format.");
      if (cvv.length < 3)                            return setError("Enter a valid CVV.");
      const network = detectNetwork(cardNum);
      methodLabel = `${network} ${maskCard(cardNum)}`;
    } else if (tab === "upi") {
      if (!upiId.trim())   return setError("Enter your UPI ID.");
      if (!upiVerified)    return setError("Please verify the UPI ID first.");
      methodLabel = `UPI – ${upiId.trim()}`;
    } else {
      if (!accName.trim())   return setError("Enter account holder name.");
      if (accNum.length < 8) return setError("Enter a valid account number.");
      if (ifsc.length < 11)  return setError("Enter a valid 11-character IFSC code.");
      if (!bankName.trim())  return setError("Enter bank name.");
      methodLabel = `${bankName} ••${accNum.slice(-4)}`;
    }

    setSavedMethod(methodLabel);
    setStep("saving");
    setTimeout(() => {
      setStep("success");
      onSave?.(methodLabel);
    }, 1800);
  }

  const handleVerifyUPI = () => {
    const ok = /^[\w.\-]+@[\w]+$/.test(upiId.trim());
    setUpiVerified(ok);
    setError(ok ? "" : "Invalid UPI ID format (e.g. name@okaxis, name@upi).");
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="surface-card !rounded-2xl shadow-popover w-full max-w-md overflow-hidden animate-scale-in">
        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Update Payment Method</h2>
            {currentMethod && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current: <span className="font-semibold text-slate-600 dark:text-slate-300">{currentMethod}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="icon-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── saving ── */}
        {step === "saving" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="animate-spin w-10 h-10 text-launcher-600" />
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Saving your payment method…</p>
            <p className="text-[11px] text-slate-400">Please wait</p>
          </div>
        )}

        {/* ── success ── */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-12 px-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Payment method updated!</h3>
              <p className="text-[12px] text-slate-400 mt-1">Your new method is now on file</p>
            </div>
            <div className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Active Payment Method</p>
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">{savedMethod}</p>
            </div>
            <button onClick={onClose} className="btn-primary btn-md w-full">
              Done
            </button>
          </div>
        )}

        {/* ── form ── */}
        {step === "form" && (
          <>
            {/* tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              {[
                { id: "card", label: "Card" },
                { id: "upi",  label: "UPI" },
                { id: "bank", label: "Bank Transfer" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setError(""); }}
                  className={`flex-1 py-3 text-[12px] font-semibold transition border-b-2 ${
                    tab === t.id
                      ? "border-launcher-600 text-launcher-600 bg-white dark:bg-white/[0.04]"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
                </div>
              )}

              {/* ── CARD ── */}
              {tab === "card" && (
                <div className="space-y-3">
                  <Field label="Cardholder Name">
                    <input
                      type="text" value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name on card" className={INPUT}
                    />
                  </Field>
                  <Field label="Card Number">
                    <div className="relative">
                      <input
                        type="text" value={cardNum}
                        onChange={(e) => setCardNum(formatCard(e.target.value))}
                        placeholder="1234 5678 9012 3456" maxLength={19}
                        className={INPUT + " font-mono pr-16"}
                      />
                      {cardNum.replace(/\s/g,"").length >= 1 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          {detectNetwork(cardNum)}
                        </span>
                      )}
                    </div>
                  </Field>
                  <div className="flex gap-3">
                    <Field label="Expiry" className="flex-1">
                      <input
                        type="text" value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY" maxLength={5} className={INPUT + " font-mono"}
                      />
                    </Field>
                    <Field label="CVV" className="flex-1">
                      <input
                        type="password" value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="•••" maxLength={3} className={INPUT + " font-mono"}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {["VISA", "MC", "RuPay", "Amex"].map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 text-[9px] font-bold text-slate-400">{c}</span>
                    ))}
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3 h-3" />
                      256-bit SSL
                    </span>
                  </div>
                </div>
              )}

              {/* ── UPI ── */}
              {tab === "upi" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Enter the UPI ID you want to use for future renewals.
                  </p>
                  <Field label="UPI ID">
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text" value={upiId}
                        onChange={(e) => { setUpiId(e.target.value); setUpiVerified(null); }}
                        placeholder="yourname@okaxis" className="input-field px-3 py-2.5"
                      />
                      <button
                        onClick={handleVerifyUPI}
                        className="btn-secondary btn-md !text-launcher-600 whitespace-nowrap"
                      >
                        Verify
                      </button>
                    </div>
                  </Field>
                  {upiVerified === true && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                      UPI ID verified successfully
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    {[
                      { label: "GPay",  bg: "#00B9F1" },
                      { label: "PhPe",  bg: "#5F259F" },
                      { label: "Paytm", bg: "#002970" },
                      { label: "BHIM",  bg: "#EF7F1A" },
                    ].map((a) => (
                      <div key={a.label} className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[8px] font-bold text-white" style={{ background: a.bg }}>
                          {a.label}
                        </div>
                        <span className="text-[8px] text-slate-400">{a.label}</span>
                      </div>
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1">& more</span>
                  </div>
                </div>
              )}

              {/* ── BANK ── */}
              {tab === "bank" && (
                <div className="space-y-3">
                  <div className="px-3 py-2.5 rounded-xl bg-launcher-50 dark:bg-launcher-500/10 border border-launcher-200 dark:border-launcher-500/20">
                    <p className="text-[11px] text-launcher-700 dark:text-launcher-300 font-semibold">NEFT / IMPS / RTGS</p>
                    <p className="text-[10px] text-launcher-600 dark:text-launcher-400 mt-0.5">
                      Add your bank account for auto-debit on renewal dates.
                    </p>
                  </div>
                  <Field label="Account Holder Name">
                    <input
                      type="text" value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="As per bank records" className={INPUT}
                    />
                  </Field>
                  <Field label="Bank Name">
                    <input
                      type="text" value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank" className={INPUT}
                    />
                  </Field>
                  <Field label="Account Number">
                    <input
                      type="text" value={accNum}
                      onChange={(e) => setAccNum(e.target.value.replace(/\D/g, "").slice(0, 18))}
                      placeholder="Enter account number" className={INPUT + " font-mono"}
                    />
                  </Field>
                  <Field label="IFSC Code">
                    <input
                      type="text" value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))}
                      placeholder="e.g. HDFC0001234" className={INPUT + " font-mono uppercase"}
                    />
                  </Field>
                </div>
              )}

              {/* ── actions ── */}
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="btn-secondary btn-md flex-1">
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary btn-md flex-1">
                  Save Method
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── tiny layout helper ────────────────────────────────────────────────────────
function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}
