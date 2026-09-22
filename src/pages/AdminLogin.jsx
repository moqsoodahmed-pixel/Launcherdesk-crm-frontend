import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { clearAllCache } from "../data/axiosConfig";
import CRMEncryption from "../utils/CRMEncryption";
import toast from "react-hot-toast";
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Users } from "lucide-react";

const crm = new CRMEncryption();

export default function AdminLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  // ── BIP39 mnemonic setup/restore state ─────────────────────────────────────
  const [showMnemonicModal,   setShowMnemonicModal]   = useState(false);
  const [showRestoreModal,    setShowRestoreModal]     = useState(false);
  const [generatedMnemonic,   setGeneratedMnemonic]   = useState("");
  const [restoreInput,        setRestoreInput]         = useState("");
  const [mnemonicConfirmed,   setMnemonicConfirmed]   = useState(false);
  const [restoreLoading,      setRestoreLoading]       = useState(false);
  const [restoreError,        setRestoreError]         = useState("");
  const [pendingToken,        setPendingToken]         = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/admin/login", { email, password });

      // Block super_admin accounts from the admin login — they must use /superadmin/login
      if (res.data.role === "super_admin" || res.data.role === "superadmin") {
        setError("This is a Super Admin account. Please sign in at the Super Admin login page.");
        return;
      }

      const token = res.data.token;

      // Wipe any responses cached under a previous session on this tab before
      // storing the new token — otherwise this admin can briefly see the
      // previous admin's cached dashboard/leads data.
      clearAllCache();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({
        _id:       res.data._id,
        name:      res.data.name,
        email:     res.data.email,
        companyId: res.data.company,   // adminAuthController returns company (ObjectId)
        company:   res.data.company,   // keep for legacy reads
        role:      res.data.role || "admin",
      }));
      // Notify same-tab listeners (window 'storage' event doesn't fire in the same tab)
      window.dispatchEvent(new Event("user_changed"));

      // ── BIP39 Encryption Setup ────────────────────────────────────────────
      const existingKey = crm.getLocalKey();
      if (!existingKey) {
        // No key in localStorage — either new device or first time
        // Check server to know if encryption is already set up
        try {
          const statusRes = await api.get("/privacy/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const { dataEncryptionEnabled } = statusRes.data;

          if (!dataEncryptionEnabled) {
            // First-time setup — generate mnemonic, show to user
            setPendingToken(token);
            const { mnemonic } = await crm.setupEncryption(
              import.meta.env.VITE_API_URL || "http://localhost:5000/api",
              token
            );
            setGeneratedMnemonic(mnemonic);
            setShowMnemonicModal(true);
            return; // don't navigate yet — wait for user to confirm they saved phrase
          } else {
            // Encryption is set up but key not in localStorage → restore flow
            setPendingToken(token);
            setShowRestoreModal(true);
            return;
          }
        } catch {
          // If privacy check fails, proceed to dashboard anyway
          toast.success("Admin login successful! Welcome back.");
          navigate("/dashboard");
        }
      } else {
        toast.success("Admin login successful! Welcome back.");
        navigate("/dashboard");
      }
    } catch (err) {
      const d = err?.response?.data;
      if (d?.marketingOnly || d?.redirectTo === "/marketing/login") {
        setError("This account is for the Performance Marketing Dashboard. Please log in at: launcherdesk.com/marketing/login");
      } else {
        setError(d?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── User confirmed they saved the mnemonic phrase ─────────────────────────
  const handleMnemonicConfirmed = () => {
    setShowMnemonicModal(false);
    setGeneratedMnemonic("");
    toast.success("Admin login successful! Welcome back.");
    navigate("/dashboard");
  };

  // ── User restores key from mnemonic on new device ─────────────────────────
  const handleRestore = async () => {
    if (!restoreInput.trim()) return setRestoreError("Please enter your 12-word phrase.");
    setRestoreLoading(true);
    setRestoreError("");
    try {
      await crm.restoreFromMnemonic(
        restoreInput.trim(),
        import.meta.env.VITE_API_URL || "http://localhost:5000/api",
        pendingToken
      );
      setShowRestoreModal(false);
      toast.success("Admin login successful! Welcome back.");
      navigate("/dashboard");
    } catch (err) {
      setRestoreError(err.message || "Could not restore key. Check your phrase.");
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2">
      <style>{`
        .ta-input { outline: none; }
        .ta-input:focus { border-color: #3C50E0; box-shadow: 0 0 0 3px rgba(60,80,224,0.12); }
        .ta-btn { transition: background-color .15s ease, transform .15s ease; }
        .ta-btn:hover:not(:disabled) { background-color: #2939c4; }
        .ta-btn:active:not(:disabled) { transform: translateY(1px); }
      `}</style>

      <div className="flex min-h-screen w-full">
        {/* ── Left brand panel ─────────────────────────────────────────────── */}
        <div className="hidden w-full lg:flex lg:w-1/2 bg-[#1C2434] relative overflow-hidden flex-col justify-between px-14 py-12">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <img src="/launcherdesk_logo.svg" alt="LauncherDesk" className="w-10 h-10 rounded-lg bg-white p-1" />
            <span className="text-lg font-semibold text-white">LauncherDesk CRM</span>
          </div>

          <div className="relative max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 p-2.5">
              <img src="/launcherdesk_logo.svg" alt="LauncherDesk" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Manage your company from one place
            </h2>
            <p className="text-sm text-[#AEB7C0] leading-relaxed">
              Sign in as an Admin to manage leads, employees, campaigns and reporting
              for your organization — securely, end to end.
            </p>
          </div>

          <p className="relative text-xs text-[#8A94A6]">© {new Date().getFullYear()} LauncherDesk Solutions Pvt Ltd</p>
        </div>

        {/* ── Right form panel ─────────────────────────────────────────────── */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <img src="/launcherdesk_logo.svg" alt="LauncherDesk" className="w-9 h-9 rounded-lg" />
              <span className="text-base font-semibold text-black dark:text-white">LauncherDesk CRM</span>
            </div>

            <h1 className="text-2xl font-bold text-black dark:text-white mb-1">Admin Portal</h1>
            <p className="text-sm text-body dark:text-bodydark mb-8">Sign in to manage your company</p>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
                <svg className="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm font-medium text-danger">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">Email</label>
                <div className="relative">
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@company.com" autoComplete="email"
                    className="ta-input w-full rounded-lg border border-stroke bg-transparent py-3.5 px-5 text-black dark:text-white dark:border-strokedark dark:bg-form-input transition"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password"
                    className="ta-input w-full rounded-lg border border-stroke bg-transparent py-3.5 px-5 pr-11 text-black dark:text-white dark:border-strokedark dark:bg-form-input transition"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-body hover:text-primary dark:text-bodydark transition">
                    {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="ta-btn flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-3.5 font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Signing in...</>
                  : "Sign in as Admin"
                }
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-stroke dark:border-strokedark flex flex-col items-center gap-2.5">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-body hover:text-primary dark:text-bodydark transition">
                <Users className="w-3.5 h-3.5" /> Sign in as Employee
              </Link>
              <Link to="/superadmin/login" className="inline-flex items-center gap-1.5 text-sm text-body hover:text-primary dark:text-bodydark transition">
                <ShieldCheck className="w-3.5 h-3.5" /> Sign in as SuperAdmin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── BIP39 Mnemonic Setup Modal ────────────────────────────────────────── */}
      {showMnemonicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg bg-white dark:bg-boxdark rounded-2xl shadow-2xl p-8 border border-stroke dark:border-strokedark">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-1">Save Your Recovery Phrase</h2>
            <p className="text-sm text-body dark:text-bodydark mb-5">
              These 12 words are your encryption key. Write them down and store safely.
              If you lose them and clear your browser, <strong className="text-danger">your lead data cannot be recovered</strong>.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {generatedMnemonic.split(" ").map((word, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-2 dark:bg-meta-4 border border-stroke dark:border-strokedark">
                  <span className="text-[10px] font-bold text-body dark:text-bodydark w-4">{i + 1}.</span>
                  <span className="text-sm font-semibold text-primary">{word}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-body dark:text-bodydark mb-5 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> A backup file was also downloaded to your computer.
            </p>

            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input type="checkbox" checked={mnemonicConfirmed} onChange={e => setMnemonicConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary" />
              <span className="text-sm text-body dark:text-bodydark">
                I have written down all 12 words and saved the backup file. I understand that losing this phrase means losing access to my encrypted data.
              </span>
            </label>

            <button onClick={handleMnemonicConfirmed} disabled={!mnemonicConfirmed}
              className="ta-btn w-full py-3.5 rounded-lg bg-primary text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed">
              I've saved my phrase — Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── BIP39 Restore Modal (new device / cleared browser) ───────────────── */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-2xl shadow-2xl p-8 border border-stroke dark:border-strokedark">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-1">Restore Encryption Key</h2>
            <p className="text-sm text-body dark:text-bodydark mb-5">
              Your encryption key is not found in this browser. Enter your 12-word recovery phrase to restore access to your data.
            </p>

            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Recovery Phrase (12 words)
            </label>
            <textarea value={restoreInput} onChange={e => setRestoreInput(e.target.value)}
              placeholder="apple orange river moon king fish table road cloud sun boat lamp"
              rows={3}
              className="ta-input w-full px-5 py-3.5 rounded-lg border border-stroke dark:border-strokedark bg-transparent dark:bg-form-input text-sm text-black dark:text-white resize-none mb-3"
            />

            {restoreError && (
              <p className="text-sm text-danger mb-3">{restoreError}</p>
            )}

            <button onClick={handleRestore} disabled={restoreLoading}
              className="ta-btn w-full py-3.5 rounded-lg bg-primary text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {restoreLoading
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Verifying...</>
                : "Restore & Continue"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}