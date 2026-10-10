// src/components/SheetIntegrationAdminSettings.jsx — NEW
// ─────────────────────────────────────────────────────────────────────────────
// Company Admin control for the Employee Excel / Google Sheet integration
// (spec §9). Rendered in the header next to the other admin settings icons.
//
// Self-hiding: on mount it GETs /sheet-integration/admin/settings. If the
// backend replies 403 SHEET_FEATURE_NOT_AVAILABLE (the Developer hasn't made
// the feature available to this company), the component renders NOTHING — the
// admin never sees a control they can't use. Once available, the admin can
// enable the feature for their employees and tune the allow* sub-permissions.
//
// Enabling here flips company.employeeSheetIntegration.enabled, which (combined
// with developer availability) makes the "Excel / Google Sheet" item appear in
// each employee's sidebar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import api, { clearCache } from "../data/axiosConfig";
import {
  Sheet, X, Loader2, Save, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Users,
} from "lucide-react";

const SUB_PERMS = [
  { key: "allowConnect",    label: "Allow employees to connect sheets" },
  { key: "allowEdit",       label: "Allow employees to edit connections" },
  { key: "allowDisconnect", label: "Allow employees to disconnect" },
  { key: "allowManualSync", label: "Allow manual sync" },
];

function Row({ label, on, onToggle, disabled }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition text-left
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-400 dark:hover:border-indigo-500"}
        border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]`}>
      <span className="text-[12px] font-medium text-slate-900 dark:text-white">{label}</span>
      {on
        ? <ToggleRight className="w-6 h-6 text-emerald-500 shrink-0" />
        : <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600 shrink-0" />}
    </button>
  );
}

export default function SheetIntegrationAdminSettings() {
  const [available, setAvailable] = useState(false); // developer availability
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [connectedEmployees, setConnectedEmployees] = useState(0);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/sheet-integration/admin/settings");
      setSettings(data.settings);
      setConnectedEmployees(data.connectedEmployees || 0);
      setAvailable(true);
    } catch (e) {
      // 403 => not available for this company: hide the whole control.
      if (e.response?.status === 403) setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const { data } = await api.put("/sheet-integration/admin/settings", settings);
      clearCache("/sheet-integration");
      setSettings(data.settings);
      setMsg({ type: "ok", text: "Settings saved." });
      // entitlements changed (enabled affects the employee sidebar) — refresh
      window.dispatchEvent(new Event("plan_updated"));
    } catch (e) {
      setMsg({ type: "err", text: e.response?.data?.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !available) return null; // hidden until known-available

  return (
    <>
      <button onClick={() => setOpen(true)} title="Excel / Google Sheet Integration"
        className="icon-btn">
        <Sheet className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}>
          <div className="surface-card shadow-popover w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sheet className="w-4 h-4 text-indigo-500" /> Employee Sheet Integration
              </h2>
              <button onClick={() => setOpen(false)}
                className="icon-btn w-7 h-7">
                <X className="w-4 h-4" />
              </button>
            </div>

            {settings && (
              <div className="space-y-3">
                <Row label="Enable Excel / Google Sheet Integration" on={settings.enabled} onToggle={() => toggle("enabled")} />

                <div className={`space-y-2 ${settings.enabled ? "" : "opacity-50 pointer-events-none"}`}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide pt-1">Employee permissions</p>
                  {SUB_PERMS.map((p) => (
                    <Row key={p.key} label={p.label} on={!!settings[p.key]} onToggle={() => toggle(p.key)} disabled={!settings.enabled} />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <Users className="w-3.5 h-3.5" /> {connectedEmployees} employee{connectedEmployees === 1 ? "" : "s"} connected
                </div>

                {msg && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border ${
                    msg.type === "ok"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"}`}>
                    {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {msg.text}
                  </div>
                )}

                <button onClick={save} disabled={saving}
                  className="btn-primary btn-md w-full mt-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
