import { useState, useEffect, useCallback } from "react";
import api from "../data/axiosConfig";
import { Megaphone, Loader2, Link2, CheckCircle2, ChevronDown, KeyRound, RefreshCw, AlertTriangle } from "lucide-react";
import GoogleOAuthSetupForm from "./GoogleOAuthSetupForm";
import { Pill } from "./ui/Primitives";

// Google Ads API connect card — live metrics (impressions/clicks/cost/etc.).
// Mirrors GoogleAnalyticsConnect: setup form when creds missing → Connect →
// pick account → Sync. After a sync, live spend/clicks/impressions land on the
// per-campaign GoogleAdsConfig docs, so the existing Google Ads dashboard updates.
export default function GoogleAdsApiConnect({ onSynced }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState(null);
  const [editCreds, setEditCreds] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/google-ads-api/status"); setStatus(data); }
    catch { setStatus({ connected: false, oauthConfigured: true, developerToken: true }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const gads = p.get("gads");
    if (gads) {
      if (gads === "connected") setMsg("Google Ads connected.");
      else if (gads === "denied") setError("Google access was denied. Click Connect Google Ads and approve the requested permissions.");
      else if (gads === "expired") setError(p.get("gads_reason") || "The connect link expired — click Connect Google Ads to try again.");
      else setError(p.get("gads_reason") || "Could not connect Google Ads. Check that the Redirect URI saved in your API credentials exactly matches the one registered in Google Cloud Console.");
      loadStatus();
      p.delete("gads"); p.delete("gads_reason");
      const q = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    }
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected && status?.needsAccount) {
      api.get("/google-ads-api/accounts").then(({ data }) => { setAccounts(data.accounts || []); if ((!data.accounts || !data.accounts.length) && data.hint) setError(data.hint); }).catch((e) => { setAccounts([]); setError(e?.response?.data?.googleError ? `${e.response.data.message} (${e.response.data.googleError})` : (e?.response?.data?.message || "Could not list accounts.")); });
    }
  }, [status]);

  const connect = async () => {
    setBusy(true); setError("");
    try { const { data } = await api.get("/google-ads-api/connect-url"); window.location.href = data.url; }
    catch (e) { setError(e?.response?.data?.message || "Could not start connect."); setBusy(false); }
  };
  const chooseAccount = async (a) => {
    setBusy(true); setError("");
    try { await api.post("/google-ads-api/account", { customerId: a.customerId, customerName: a.customerName }); await loadStatus(); }
    catch (e) { setError(e?.response?.data?.message || "Could not save account."); }
    finally { setBusy(false); }
  };
  const runSync = async () => {
    setSyncing(true); setError(""); setMsg("");
    try {
      const { data } = await api.post("/google-ads-api/sync");
      setMsg(`Synced ${data.campaigns} campaigns (${data.updated} updated, ${data.created} added).`);
      const pe = data.partialErrors || {};
      const reasons = Object.keys(pe).filter((k) => pe[k]).map((k) => `${k}: ${pe[k]}`);
      if (reasons.length) setError(reasons.join(" · "));
      await loadStatus();
      onSynced && onSynced();
    } catch (e) { setError(e?.response?.data?.message || "Sync failed."); }
    finally { setSyncing(false); }
  };
  const disconnect = async () => { if (!window.confirm("Disconnect Google Ads API?")) return; await api.delete("/google-ads-api"); loadStatus(); };
  const onCredsSaved = async () => { setEditCreds(false); await loadStatus(); };

  const CARD = "surface-card";

  if (loading) return <div className={`${CARD} p-4 flex items-center justify-center`}><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>;

  // Credentials not configured (or editing) → setup form
  if (status?.oauthConfigured === false || editCreds) {
    return (
      <div className={`${CARD} p-4`}>
        <GoogleOAuthSetupForm variant="ads" compact onSaved={onCredsSaved} onCancel={editCreds ? () => setEditCreds(false) : undefined} />
        {status?.developerToken === false && (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> Server developer token not set (GOOGLE_ADS_DEVELOPER_TOKEN). You can connect, but syncing needs it.</p>
        )}
      </div>
    );
  }

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Megaphone className="w-4.5 h-4.5 text-blue-600" /></div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">Google Ads (live metrics)</p>
          <p className="text-[11px] text-slate-400 truncate">{status?.connected ? (status.customerName || status.connectedEmail || "Connected") : "Pull impressions, clicks, cost & conversions automatically"}</p>
        </div>
        {status?.connected && status?.customerId && <Pill tone="emerald" icon={CheckCircle2} className="ml-auto shrink-0">Connected</Pill>}
      </div>

      {status?.developerToken === false && (
        <p className="mb-3 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> Server developer token not set — set GOOGLE_ADS_DEVELOPER_TOKEN to enable syncing.</p>
      )}
      {error && <p className="text-[12px] text-rose-600 dark:text-rose-400 mb-2">{error}</p>}
      {msg && <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mb-2">{msg}</p>}

      {!status?.connected ? (
        <button onClick={connect} disabled={busy} className="btn-primary btn-md w-full">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Connect Google Ads
        </button>
      ) : status?.needsAccount ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-400 mb-1">Select the Google Ads account:</p>
          {accounts == null ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> :
            accounts.length === 0 ? <p className="text-[11px] text-slate-400">No accessible accounts found.</p> :
            accounts.map((a) => (
              <button key={a.customerId} onClick={() => chooseAccount(a)} disabled={busy}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 text-left text-[12px] disabled:opacity-50 text-slate-900 dark:text-white">
                <span className="truncate"><span className="font-semibold">{a.customerName}</span> <span className="text-slate-400">· {a.customerId}</span></span>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-400" />
              </button>
            ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={runSync} disabled={syncing || status?.developerToken === false}
            className="btn-primary btn-md flex-1">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync now
          </button>
          <button onClick={disconnect} className="btn-danger btn-md">Disconnect</button>
        </div>
      )}

      {status?.connected && !status?.needsAccount && (
        <p className="text-[10px] text-slate-400 mt-2">{status.lastSyncedAt ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}` : "Not synced yet — click Sync now."}</p>
      )}

      {status?.oauthSource === "db" && (
        <button onClick={() => setEditCreds(true)} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <KeyRound className="w-3 h-3" /> Edit API credentials
        </button>
      )}
    </div>
  );
}
