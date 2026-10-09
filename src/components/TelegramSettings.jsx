// src/components/TelegramSettings.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Telegram notification settings — two-tier:
//
//  TAB 1 — "Company Group"
//    Shared group chat for all campaign leads → company.telegramChatId
//    Only super_admin can edit bot token; both admin roles can toggle/test.
//
//  TAB 2 — "Admin Alerts" (super_admin only)
//    Each admin in the company gets their own personal chat ID + on/off toggle.
//    When a campaign lead arrives, EVERY admin with a configured chat ID
//    receives a personal notification (via the company's shared bot token).
//
// Backend APIs:
//   GET  /admin/company/telegram                     → company-level config
//   PUT  /admin/company/telegram                     → save company config
//   POST /admin/company/telegram/test                → test company group
//   GET  /admin/company/telegram/admins              → list admins + their config
//   PUT  /admin/company/telegram/admins/:id          → save one admin's config
//   POST /admin/company/telegram/admins/:id/test     → test one admin's chat
//
// MOBILE FIX:
//   Replaced `absolute right-0` popover with a createPortal into document.body
//   using `position: fixed` + viewport-clamped `left` value. This prevents the
//   panel from overflowing the left edge on narrow screens regardless of where
//   the trigger button sits in the header. Also moved `ref={popoverRef}` off
//   the outer wrapper (which broke the toggle) onto the portal panel only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../data/axiosConfig";
import { getRole } from "../data/dataService";
import { Pill } from "./ui/Primitives";
import {
  Send,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  Lock,
  Users,
  Building2,
} from "lucide-react";

// Campaign sources that trigger notifications — mirrors telegramService.js
const CAMPAIGN_SOURCES = ["Meta (Facebook/Instagram)", "Google Ads", "Website/Landing Page"];

// ── MOBILE FIX: viewport-clamped popover position ────────────────────────────
// Panel is 340px wide (matches max-w-[340px] below). On narrow screens it is
// right-aligned to the trigger button but clamped so it never overflows left
// or right viewport edges.
const PANEL_WIDTH  = 340;
const PANEL_MARGIN = 8; // min distance from screen edge

function getPanelStyle(btnRef) {
  if (!btnRef.current) return {};
  const rect = btnRef.current.getBoundingClientRect();
  const vw   = window.innerWidth;

  // Ideal: right-align panel to button's right edge
  let left = rect.right - PANEL_WIDTH;

  // Clamp: never bleed off either edge
  left = Math.max(PANEL_MARGIN, left);
  left = Math.min(left, vw - PANEL_WIDTH - PANEL_MARGIN);

  return {
    position: "fixed",
    top:      rect.bottom + 8,
    left,
    width:    Math.min(PANEL_WIDTH, vw - PANEL_MARGIN * 2), // shrink on very small screens
    zIndex:   9999,
  };
}

// ── Inline feedback banner ────────────────────────────────────────────────────
function Feedback({ msg }) {
  if (!msg?.text) return null;
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium border
        ${msg.type === "ok"
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
          : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
        }`}
    >
      {msg.type === "ok"
        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        : <AlertCircle  className="w-3.5 h-3.5 shrink-0" />
      }
      {msg.text}
    </div>
  );
}

// ── Company Group Tab ─────────────────────────────────────────────────────────
function CompanyGroupTab({ isSuperAdmin }) {
  const [loading,      setLoading]      = useState(true);
  const [chatId,       setChatId]       = useState("");
  const [hasToken,     setHasToken]     = useState(false);
  const [enabled,      setEnabled]      = useState(false);
  const [draftChat,    setDraftChat]    = useState("");
  const [draftToken,   setDraftToken]   = useState("");
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [showToken,    setShowToken]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [msg,          setMsg]          = useState({ type: "", text: "" });
  const inputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get("/admin/company/telegram")
      .then((res) => {
        const d = res.data || {};
        const id  = d.telegramChatId  || "";
        const tok = d.hasToken        || false;
        const en  = d.telegramEnabled || false;
        setChatId(id);    setDraftChat(id);
        setHasToken(tok);
        setEnabled(en);   setDraftEnabled(en);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const flash = (type, text) => {
    setMsg({ type, text });
    if (type === "ok") setTimeout(() => setMsg({ type: "", text: "" }), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { telegramChatId: draftChat.trim(), telegramEnabled: draftEnabled };
      if (draftToken.trim()) payload.telegramBotToken = draftToken.trim();
      await api.put("/admin/company/telegram", payload);
      setChatId(draftChat.trim());
      setEnabled(draftEnabled);
      if (draftToken.trim()) setHasToken(true);
      setDraftToken("");
      flash("ok", "Saved!");
    } catch (e) {
      flash("err", e.response?.data?.message || "Save failed.");
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.post("/admin/company/telegram/test");
      flash("ok", "Test sent! Check your Telegram group.");
    } catch (e) {
      flash("err", e.response?.data?.message || "Test failed — check token & chat ID.");
    } finally { setTesting(false); }
  };

  const isConfigured = !!chatId && hasToken;
  const hasChanges   = draftChat !== chatId || draftToken.trim() !== "" || draftEnabled !== enabled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Campaign sources info */}
      <div className="px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/30">
        <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 mb-1.5">
          Notifies for campaign leads only:
        </p>
        <div className="flex flex-wrap gap-1">
          {CAMPAIGN_SOURCES.map(s => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-800/40 text-sky-700 dark:text-sky-300 font-medium">
              {s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1.5">
          Manual entries, CSV imports, bulk uploads — never notified.
        </p>
      </div>

      {/* Enable / disable toggle */}
      <button
        type="button"
        onClick={() => setDraftEnabled(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors
          ${draftEnabled
            ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]"
          }`}
      >
        <div className="text-left">
          <p className={`text-[12px] font-semibold ${draftEnabled ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
            {draftEnabled ? "Notifications enabled" : "Notifications paused"}
          </p>
          <p className="text-[10px] text-slate-400">
            {draftEnabled ? "Campaign leads will be sent to Telegram" : "No messages will be sent"}
          </p>
        </div>
        {draftEnabled
          ? <ToggleRight className="w-5 h-5 text-emerald-500 shrink-0" />
          : <ToggleLeft  className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
        }
      </button>

      {/* Bot Token — super_admin only */}
      {isSuperAdmin ? (
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Bot Token
            {hasToken
              ? <Pill tone="emerald" className="!text-[10px] !py-0.5">set — leave blank to keep</Pill>
              : <Pill tone="amber" className="!text-[10px] !py-0.5">not set</Pill>
            }
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type={showToken ? "text" : "password"}
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
              placeholder={hasToken ? "Enter new token to replace…" : "7123456789:AAHxxxxxxxx"}
              className="input-field px-3 py-2 pr-8 text-[11px] font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition"
            >
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Create via <span className="font-mono font-semibold">@BotFather</span> on Telegram. Shared by all admins.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">Bot token is managed by your Super Admin.</p>
        </div>
      )}

      {/* Group Chat ID */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
          Group Chat ID
          {chatId && <Pill tone="emerald" className="!text-[10px] !py-0.5">connected</Pill>}
        </label>
        <input
          type="text"
          value={draftChat}
          onChange={(e) => setDraftChat(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="-1001234567890"
          className="input-field px-3 py-2 text-[11px] font-mono"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Add bot to group → get ID via <span className="font-mono font-semibold">@userinfobot</span>
        </p>
      </div>

      <Feedback msg={msg} />

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary btn-sm flex-1"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !isConfigured}
          title={!isConfigured ? "Save bot token and chat ID first" : "Send a test message to the group"}
          className="btn-secondary btn-sm"
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Test
        </button>
      </div>

      {!isConfigured && (
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-center pb-0.5">
          <Lock className="w-3 h-3" />
          Add bot token + chat ID, then save to activate
        </p>
      )}
    </div>
  );
}

// ── Admin Alerts Tab ──────────────────────────────────────────────────────────
function AdminAlertsTab() {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});
  const [testing, setTesting] = useState({});
  const [msgs,    setMsgs]    = useState({});
  const [drafts,  setDrafts]  = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get("/admin/company/telegram/admins");
      const list = res.data || [];
      setAdmins(list);
      const d = {};
      list.forEach(a => {
        d[a._id] = {
          chatId:  a.telegramChatId  || "",
          enabled: a.telegramNotificationsEnabled !== false,
        };
      });
      setDrafts(d);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setDraft = (adminId, field, value) =>
    setDrafts(prev => ({ ...prev, [adminId]: { ...prev[adminId], [field]: value } }));

  const flash = (adminId, type, text) => {
    setMsgs(prev => ({ ...prev, [adminId]: { type, text } }));
    if (type === "ok") setTimeout(() =>
      setMsgs(prev => ({ ...prev, [adminId]: { type: "", text: "" } })), 3500);
  };

  const handleSave = async (adminId) => {
    setSaving(prev => ({ ...prev, [adminId]: true }));
    try {
      const d = drafts[adminId] || {};
      await api.put(`/admin/company/telegram/admins/${adminId}`, {
        telegramChatId:               d.chatId.trim(),
        telegramNotificationsEnabled: d.enabled,
      });
      setAdmins(prev => prev.map(a =>
        String(a._id) === String(adminId)
          ? { ...a, telegramChatId: d.chatId.trim(), telegramNotificationsEnabled: d.enabled }
          : a
      ));
      flash(adminId, "ok", "Saved!");
    } catch (e) {
      flash(adminId, "err", e.response?.data?.message || "Save failed.");
    } finally {
      setSaving(prev => ({ ...prev, [adminId]: false }));
    }
  };

  const handleTest = async (adminId) => {
    setTesting(prev => ({ ...prev, [adminId]: true }));
    try {
      await api.post(`/admin/company/telegram/admins/${adminId}/test`);
      flash(adminId, "ok", "Test sent! Check Telegram.");
    } catch (e) {
      flash(adminId, "err", e.response?.data?.message || "Test failed.");
    } finally {
      setTesting(prev => ({ ...prev, [adminId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Info banner */}
      <div className="px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
          Each admin can receive <strong>personal</strong> campaign lead notifications in their own Telegram chat.
          Uses the company bot token — only the chat ID differs per admin.
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
          <Users className="w-7 h-7 opacity-30" />
          <p className="text-[12px]">No admins found for this company.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-0.5">
          {admins.map(admin => {
            const draft     = drafts[admin._id] || { chatId: "", enabled: true };
            const saved     = admin.telegramChatId || "";
            const isSaving  = saving[admin._id]  || false;
            const isTesting = testing[admin._id] || false;
            const fb        = msgs[admin._id]    || { type: "", text: "" };
            const isDirty   = draft.chatId.trim() !== saved
              || draft.enabled !== (admin.telegramNotificationsEnabled !== false);
            const isReady   = !!saved;

            return (
              <div key={admin._id} className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 space-y-2.5">

                {/* Admin header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                      {(admin.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{admin.name}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill tone={admin.role === "super_admin" ? "violet" : "slate"} className="!text-[9px]">
                      {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    </Pill>
                    <button
                      onClick={() => setDraft(admin._id, "enabled", !draft.enabled)}
                      title={draft.enabled ? "Disable notifications for this admin" : "Enable notifications for this admin"}
                      className="shrink-0"
                    >
                      {draft.enabled
                        ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                        : <ToggleLeft  className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      }
                    </button>
                  </div>
                </div>

                {/* Personal Chat ID input */}
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Personal Chat ID
                    {isReady && <Pill tone="emerald" className="!text-[9px] !py-0 normal-case tracking-normal">connected</Pill>}
                  </label>
                  <input
                    type="text"
                    value={draft.chatId}
                    onChange={e => setDraft(admin._id, "chatId", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave(admin._id); }}
                    placeholder="e.g. 987654321"
                    className="input-field px-3 py-1.5 text-[11px] font-mono"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Admin gets this via <span className="font-mono">@userinfobot</span> on Telegram
                  </p>
                </div>

                {fb.text && <Feedback msg={fb} />}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(admin._id)}
                    disabled={isSaving || !isDirty}
                    className="btn-primary btn-sm flex-1"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => handleTest(admin._id)}
                    disabled={isTesting || !isReady}
                    title={!isReady ? "Save a chat ID first" : "Send test to this admin"}
                    className="btn-secondary btn-sm"
                  >
                    {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Test
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TelegramSettings() {
  const role         = getRole();
  const isSuperAdmin = role === "superadmin" || role === "super_admin";

  const [open,       setOpen]       = useState(false);
  const [activeTab,  setActiveTab]  = useState("company");
  const [panelStyle, setPanelStyle] = useState({});

  // Separate refs: button for position calculation, panel for outside-click
  const btnRef   = useRef(null);
  const panelRef = useRef(null);

  // Status dot — re-fetched each time the popover closes so it reflects saved changes
  const [dotData, setDotData] = useState({ enabled: false, configured: false });

  useEffect(() => {
    api.get("/admin/company/telegram")
      .then(res => {
        const d = res.data || {};
        setDotData({
          enabled:    d.telegramEnabled || false,
          configured: !!(d.hasToken && d.telegramChatId),
        });
      })
      .catch(() => {});
  }, [open]);

  // Recompute clamped position whenever the panel opens or viewport changes
  useEffect(() => {
    if (!open) return;
    const update = () => setPanelStyle(getPanelStyle(btnRef));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on outside click / Escape
  // NOTE: panelRef is on the portal panel only — NOT the trigger button —
  // so this handler doesn't interfere with the button's own onClick toggle.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown",   onKey);
    };
  }, [open]);

  const TABS = [
    { id: "company", label: "Company Group", icon: Building2 },
    ...(isSuperAdmin ? [{ id: "admins", label: "Admin Alerts", icon: Users }] : []),
  ];

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ ...panelStyle, animation: "tgSlide 0.15s ease both" }}
      className="surface-card shadow-popover overflow-hidden"
    >
      <style>{`
        @keyframes tgSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0">
          <Send className="w-4 h-4 text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">Telegram Notifications</p>
          <p className="text-[10px] text-slate-400">Campaign leads only · company-isolated</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="icon-btn w-6 h-6"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab bar — only rendered for super_admin (has 2 tabs) */}
      {isSuperAdmin && (
        <div className="flex gap-1 px-4 pt-3 pb-0">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition flex-1 justify-center
                  ${active
                    ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab content */}
      <div className="px-4 py-3">
        {activeTab === "company" && <CompanyGroupTab isSuperAdmin={isSuperAdmin} />}
        {activeTab === "admins"  && <AdminAlertsTab />}
      </div>
    </div>
  ) : null;

  return (
    // No ref here — outer div is just a layout anchor for the trigger button
    <div className="relative">

      {/* ── Trigger button ── */}
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        title="Telegram Notifications"
        className={`icon-btn relative ${open ? "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" : ""}`}
      >
        <Send className="w-3.5 h-3.5" />
        {dotData.configured && (
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-[#181029]
            ${dotData.enabled ? "bg-emerald-500" : "bg-amber-400"}`}
          />
        )}
      </button>

      {/* Portal — escapes header stacking context, never clipped by overflow:hidden */}
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
