// src/components/MSG91ConnectSettings.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin interface to connect MSG91 credentials.
// Enables both WhatsApp blast and SMS blast.
//
// Backend expected:
//   GET  /admin/company/msg91-config    → { authKey, integratedNumber, connected }
//   PUT  /admin/company/msg91-config    → body: { authKey, integratedNumber }
//   DELETE /admin/company/msg91-config  → disconnects
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import api from "../data/axiosConfig";
import { Pill } from "./ui/Primitives";
import { MessageSquare, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const FIELD_CLS = "input-field px-3 py-2.5 font-mono";

export default function MSG91ConnectSettings({ onConnected }) {
  const [config,      setConfig]      = useState(null);
  const [authKey,     setAuthKey]     = useState("");
  const [intNumber,   setIntNumber]   = useState("");
  const [namespace,   setNamespace]   = useState("");
  const [showKey,     setShowKey]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    api.get("/admin/company/msg91-config")
      .then((res) => {
        setConfig(res.data || {});
        setAuthKey(res.data?.authKey ? "••••••••••••••••" : "");
        setIntNumber(res.data?.integratedNumber || "");
        setNamespace(res.data?.namespace || "");
      })
      .catch(() => setConfig({}));
  }, []);

  const handleSave = async () => {
    if (!authKey.trim() || authKey === "••••••••••••••••") {
      setError("Please enter your MSG91 Auth Key"); return;
    }
    if (!intNumber.trim()) {
      setError("Please enter the MSG91 integrated WhatsApp number"); return;
    }
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await api.put("/admin/company/msg91-config", {
        authKey: authKey.trim(),
        integratedNumber: intNumber.trim(),
        namespace: namespace.trim(),
      });
      setConfig(res.data);
      setAuthKey("••••••••••••••••");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onConnected?.();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save MSG91 configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect MSG91? WhatsApp and SMS blasts will stop working until reconnected.")) return;
    setDisconnecting(true);
    try {
      await api.delete("/admin/company/msg91-config");
      setConfig({});
      setAuthKey(""); setIntNumber(""); setNamespace("");
    } catch {
      setError("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = config?.connected === true;

  return (
    <div className="surface-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-slate-50 dark:bg-white/[0.04]"}`}>
          <MessageSquare className={`w-5 h-5 ${isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">MSG91 Integration</h3>
            {isConnected && <Pill tone="emerald">Connected</Pill>}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Required for WhatsApp blast and SMS blast</p>
        </div>
        {isConnected && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="btn-danger btn-sm"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Steps */}
        <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">How to get your credentials</p>
          {[
            "Log in to msg91.com → Settings → API",
            "Copy your Auth Key (keep it secret)",
            "Go to WhatsApp → Integrated Numbers to find your number",
            "Paste both below and click Connect",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-[12px] text-slate-600 dark:text-slate-300">{step}</p>
            </div>
          ))}
        </div>

        {/* Auth Key */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            MSG91 Auth Key <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              placeholder="Enter your MSG91 auth key"
              className={FIELD_CLS + " pr-10"}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">msg91.com → Settings → API → Your Auth Key</p>
        </div>

        {/* Integrated Number */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Integrated WhatsApp Number <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={intNumber}
            onChange={(e) => setIntNumber(e.target.value)}
            placeholder="e.g. 919876543210 (with country code, no +)"
            className={FIELD_CLS}
          />
          <p className="text-[10px] text-slate-500 mt-1">msg91.com → WhatsApp → Integrated Numbers</p>
        </div>

        {/* Namespace */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            MSG91 WhatsApp Namespace <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="e.g. 68bcef67_e185_4e55_94df_52c26cb0bc37"
            className={FIELD_CLS}
          />
          <p className="text-[10px] text-slate-500 mt-1">
            MSG91 dashboard → WhatsApp → Templates → Namespace. Required for auto-template delivery.
          </p>
        </div>

        {/* Brevo note for email */}
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
          <p className="text-[12px] text-amber-700 dark:text-amber-400">
            <strong>Email blast</strong> uses Brevo (formerly Sendinblue). Go to <strong>Communications → Email → Settings</strong> to connect your Brevo API key separately.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[12px] text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[12px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            MSG91 connected! WhatsApp and SMS blasts are now active.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary btn-md w-full"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Connecting…" : isConnected ? "Update Credentials" : "Connect MSG91"}
        </button>
      </div>
    </div>
  );
}