// src/components/AddonManager.jsx
// Reusable component used inside CompanyDetails page.
// Shows addon list with status badges, expiry dates, renew/disable actions.
//
// Addon types MUST match CompanyAddon.ADDON_TYPES on the backend exactly —
// this dropdown posts addonType straight to POST /addons/:companyId/grant,
// which is validated against that enum. (Previously this file used a
// "admin_seat"/"user_seat"/etc. naming scheme that doesn't exist on the
// backend, so every grant attempt for those types silently failed.)

import { useState } from "react";
import api from "../data/axiosConfig";
import { Pill } from "./ui/Primitives";
import {
  Package,
  Plus,
  RefreshCw,
  X,
  Loader2,
  ChevronDown,
  ShieldCheck,
  User,
  Mic,
  Globe,
  BarChart2,
  Share2,
} from "lucide-react";

// ─── Addon catalog ────────────────────────────────────────────────────────────
// ADDON_LABELS = currently GRANTABLE addons (drives the picker dropdown).
const ADDON_LABELS = {
  extra_admin:                    "Extra Admin (+1 admin seat)",
  extra_users_5:                  "5 Extra Users",
  extra_leads_5000:                "5,000 Extra Leads",
  extra_website:                  "Extra Website",
  extra_meta_campaign:             "Extra Meta Campaign",
  extra_google_account:            "Extra Google Account",
  storage_1gb:                    "1 GB Storage",
  storage_5gb:                    "5 GB Storage",
  storage_10gb:                   "10 GB Storage",
  call_recording:                 "Call Recording",
  call_transcription:             "Call Transcription",
  ai_summary:                     "AI Summary",
  voice_bot:                      "Voice Bot",
  whatsapp_automation:            "WhatsApp Automation",
  api_access:                     "API Access",
  webhook_access:                 "Webhook Access",
  white_label:                    "White Label",
  custom_domain:                  "Custom Domain",
  custom_branding:                "Custom Branding",
  transcription_summary_100mins:  "AI Minutes +100 (Transcription & Summary)",
  transcriptions_5000mins:        "Transcription Minutes +5,000",
  transcriptions_20000mins:       "Transcription Minutes +20,000",
  summaries_5000mins:             "Summary Minutes +5,000",
  summaries_20000mins:            "Summary Minutes +20,000",
};

// Retired types — kept only to DISPLAY legacy addon records, never in the picker.
const LEGACY_ADDON_LABELS = {
  transcriptions_100:             "AI Transcriptions +100 (legacy)",
  transcriptions_500:             "AI Transcriptions +500 (legacy)",
  summaries_100:                  "AI Summaries +100 (legacy)",
  summaries_500:                  "AI Summaries +500 (legacy)",
  transcription_summary_500mins:  "AI Minutes +500 (legacy)",
  transcription_summary_1000mins: "AI Minutes +1,000 (legacy)",
};

const ALL_ADDON_LABELS = { ...ADDON_LABELS, ...LEGACY_ADDON_LABELS };

// Icon map by addonType
const ADDON_ICONS = {
  extra_admin:                    ShieldCheck,
  extra_users_5:                  User,
  transcription_summary_100mins:  Mic,
  transcriptions_5000mins:        Mic,
  transcriptions_20000mins:       Mic,
  summaries_5000mins:             Mic,
  summaries_20000mins:            Mic,
  transcription_summary_500mins:  Mic,
  transcription_summary_1000mins: Mic,
  extra_website:                  Globe,
  extra_google_account:            BarChart2,
  extra_meta_campaign:             Share2,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_TONE = {
  active:   "emerald",
  expired:  "amber",
  disabled: "rose",
};

const PAYMENT_TONE = {
  paid:    "cyan",
  free:    "violet",
  pending: "slate",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function AddonIcon({ addonType, className = "w-4 h-4" }) {
  const Icon = ADDON_ICONS[addonType] || Package;
  return <Icon className={className} />;
}

// ─── AddonManager ─────────────────────────────────────────────────────────────

export default function AddonManager({ companyId, addons: initialAddons = [], onRefresh }) {
  const [addons,      setAddons]      = useState(initialAddons);
  const [showGrant,   setShowGrant]   = useState(false);
  const [form,        setForm]        = useState({
    addonType:      "extra_admin",
    quantity:       1,
    durationMonths: "",
    notes:          "",
    price:          "",
    currency:       "INR",
  });
  const [busy,        setBusy]        = useState(false);
  const [actionId,    setActionId]    = useState(null);
  const [error,       setError]       = useState("");
  const [renewId,     setRenewId]     = useState(null);
  const [renewMonths, setRenewMonths] = useState(1);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const reload = async () => {
    try {
      const res = await api.get(`/addons/${companyId}`);
      setAddons(res.data.addons || []);
      onRefresh?.();
    } catch {}
  };

  const handleGrant = async () => {
    setBusy(true); setError("");
    try {
      await api.post(`/addons/${companyId}/grant`, {
        addonType:      form.addonType,
        quantity:       Number(form.quantity),
        durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        notes:          form.notes,
        price:          form.price !== "" ? Number(form.price) : 0,
        currency:       form.currency || "INR",
      });
      setShowGrant(false);
      setForm({ addonType: "extra_admin", quantity: 1, durationMonths: "", notes: "", price: "", currency: "INR" });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to grant addon");
    } finally {
      setBusy(false);
    }
  };

  const handleRenew = async (addonId) => {
    setActionId(addonId); setError("");
    try {
      await api.put(`/addons/${addonId}/renew`, { durationMonths: renewMonths });
      setRenewId(null);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to renew addon");
    } finally {
      setActionId(null);
    }
  };

  const handleDisable = async (addonId) => {
    if (!window.confirm("Disable this addon? It will no longer apply to the company's entitlements.")) return;
    setActionId(addonId); setError("");
    try {
      await api.put(`/addons/${addonId}/disable`);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disable addon");
    } finally {
      setActionId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="surface-card overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <Package className="w-4 h-4 text-violet-500" />
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Addons</h3>
          <Pill tone="slate" className="!text-[11px]">
            {addons.filter(a => a.status === "active").length} active
          </Pill>
        </div>
        <button
          onClick={() => setShowGrant(true)}
          className="btn-primary btn-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Grant Addon
        </button>
      </div>

      {/* Inline error (outside modal) */}
      {error && !showGrant && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[12px]">
          {error}
        </div>
      )}

      {/* Grant Modal */}
      {showGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="surface-card shadow-elevated p-6 w-full max-w-md">

            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 dark:text-white">Grant Addon</h4>
              <button onClick={() => { setShowGrant(false); setError(""); }} className="icon-btn w-7 h-7">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">

              {/* Addon Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Addon Type
                </label>
                <div className="relative">
                  <select
                    value={form.addonType}
                    onChange={e => setForm(p => ({ ...p, addonType: e.target.value }))}
                    className="input-field px-3 py-2.5 text-sm appearance-none"
                  >
                    {Object.entries(ADDON_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Quantity + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number" min={1} value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className="input-field px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Duration (months)
                  </label>
                  <input
                    type="number" min={0} placeholder="Blank = forever"
                    value={form.durationMonths}
                    onChange={e => setForm(p => ({ ...p, durationMonths: e.target.value }))}
                    className="input-field px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Price <span className="text-slate-400 font-normal normal-case">(0 = free)</span>
                  </label>
                  <input
                    type="number" min={0} step="0.01" placeholder="0"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="input-field px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    className="input-field px-3 py-2.5 text-sm"
                  >
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                    <option value="AED">AED د.إ</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text" placeholder="Reason or context"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="input-field px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {error && <p className="mt-2 text-[12px] text-rose-500">{error}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowGrant(false); setError(""); }}
                className="btn-secondary flex-1 py-2.5 text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={handleGrant}
                disabled={busy}
                className="btn-primary flex-1 py-2.5 text-[13px]"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Addon List */}
      {addons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
          <Package className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          <p className="text-[13px]">No addons yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white dark:divide-white/10">
          {addons.map(a => (
            <div key={a._id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Addon icon */}
                  <span className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <AddonIcon addonType={a.addonType} className="w-3.5 h-3.5 text-violet-600" />
                  </span>

                  <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    {ALL_ADDON_LABELS[a.addonType] || a.addonType}
                  </span>

                  {a.quantity > 1 && (
                    <span className="text-[11px] text-slate-400">× {a.quantity}</span>
                  )}

                  <Pill tone={STATUS_TONE[a.status] || "slate"} className="!text-[10px] capitalize">
                    {a.status}
                  </Pill>

                  <Pill tone={PAYMENT_TONE[a.paymentStatus] || "slate"} className="!text-[10px] capitalize">
                    {a.paymentStatus}
                  </Pill>
                </div>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  Granted {fmtDate(a.startDate)} · Expires {fmtDate(a.expiryDate)}
                  {a.price > 0 && (
                    <span className="ml-2 font-semibold text-emerald-600">
                      {a.currency || "INR"}{" "}
                      {Number(a.price).toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </p>

                {a.notes && (
                  <p className="text-[11px] text-slate-400 italic mt-0.5">{a.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {renewId === a._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} value={renewMonths}
                      onChange={e => setRenewMonths(Number(e.target.value))}
                      className="input-field w-16 px-2 py-1 text-sm"
                    />
                    <span className="text-[11px] text-slate-400">mo</span>
                    <button
                      onClick={() => handleRenew(a._id)}
                      disabled={actionId === a._id}
                      className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition"
                    >
                      {actionId === a._id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : "Confirm"}
                    </button>
                    <button
                      onClick={() => setRenewId(null)}
                      className="text-[12px] text-slate-400 hover:text-rose-500 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    {a.status !== "disabled" && (
                      <button
                        onClick={() => { setRenewId(a._id); setRenewMonths(1); }}
                        className="flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition"
                      >
                        <RefreshCw className="w-3 h-3" /> Renew
                      </button>
                    )}
                    {a.status !== "disabled" && (
                      <button
                        onClick={() => handleDisable(a._id)}
                        disabled={actionId === a._id}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      >
                        {actionId === a._id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : "Disable"}
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
