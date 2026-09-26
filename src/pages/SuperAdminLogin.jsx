import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { clearAllCache } from "../data/axiosConfig";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

// ── 6-box OTP input ────────────────────────────────────────────────────────────
export default function SuperAdminLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const navigate = useNavigate();


  // ── Sign in: email + password only, no OTP ─────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true); setError("");
    try {
      const res = await api.post("/superadmin/login", { email, password });

      // Wipe any responses cached under a previous session on this tab before
      // storing the new token — otherwise this super admin can briefly see
      // whatever company's data was cached from the previous session.
      clearAllCache();

      localStorage.setItem("token", res.data.token);

      const companyObj = res.data.company;
      const companyId =
        res.data.companyId ||
        (companyObj && typeof companyObj === "object" ? companyObj._id : companyObj) ||
        "";
      const companyName =
        res.data.companyName ||
        (companyObj && typeof companyObj === "object" ? companyObj.name : "") ||
        "";

      localStorage.setItem("user", JSON.stringify({
        _id:         res.data._id,
        name:        res.data.name,
        email:       res.data.email,
        role:        "super_admin",
        companyId,
        companyName,
        company:     companyId, // keep for legacy reads (matches AdminLogin.jsx convention)
      }));
      window.dispatchEvent(new Event("user_changed"));
      toast.success("Super Admin login successful! Welcome back.");
      navigate("/superadmin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-boxdark-2">
      <style>{`
        .ta-input { outline: none; }
        .ta-input:focus { border-color: #FFA70B; box-shadow: 0 0 0 3px rgba(255,167,11,0.15); }
        .ta-btn { transition: background-color .15s ease, transform .15s ease; }
        .ta-btn:hover:not(:disabled) { background-color: #e0930a; }
        .ta-btn:active:not(:disabled) { transform: translateY(1px); }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px);} to { opacity:1; transform:translateX(0);} }
      `}</style>

      <div className="flex min-h-screen w-full">
        {/* ── Left brand panel ─────────────────────────────────────────────── */}
        <div className="hidden w-full lg:flex lg:w-1/2 bg-[#1C2434] relative overflow-hidden flex-col justify-between px-14 py-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-warning/5 blur-3xl" />
          <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-warning/5 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <img src="/launcherdesk_logo.svg" alt="LauncherDesk" className="w-10 h-10 rounded-lg bg-white p-1" />
            <span className="text-lg font-semibold text-white">LauncherDesk CRM</span>
          </div>

          <div className="relative max-w-md">
            <span className="inline-block mb-4 px-2 py-1 rounded-full text-[15px] font-bold uppercase tracking-widest bg-warning/10 border border-warning/20 text-white">
              Restricted Access
            </span>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Master Control
            </h2>
            <p className="text-sm text-white leading-relaxed">
              Cross-company oversight, billing and platform administration.
              Sign in with your email and password to continue.
            </p>
          </div>

          <p className="relative text-xs text-[#5D6675]">© {new Date().getFullYear()} LauncherDesk Solutions Pvt Ltd</p>
        </div>

        {/* ── Right form panel ─────────────────────────────────────────────── */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <img src="/launcherdesk_logo.svg" alt="LauncherDesk" className="w-9 h-9 rounded-lg" />
                <span className="text-base font-semibold text-white">LauncherDesk CRM</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-7">
              <span className="px-3.5 py-1.5 rounded-full text-base font-bold uppercase tracking-widest bg-warning/10 border border-warning/20 text-warning">
                Super Admin
              </span>
              <span className="ml-auto text-xs text-bodydark">Email &amp; password</span>
            </div>

            <div className="slide-in">
                <h1 className="text-[18px] font-bold text-white mb-1">Sign in</h1>
                <p className="text-sm text-bodydark mb-7">Enter your credentials to continue</p>

                {error && <ErrorBanner msg={error} />}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="mb-2.5 block font-medium text-white">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="superadmin@crm.com" autoComplete="email"
                      className="ta-input w-full rounded-lg border border-strokedark bg-boxdark-2 py-3.5 px-5 text-white placeholder:text-[#5D6675] transition"
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block font-medium text-white">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password" autoComplete="current-password"
                        className="ta-input w-full rounded-lg border border-strokedark bg-boxdark-2 py-3.5 px-5 pr-11 text-white placeholder:text-[#5D6675] transition"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark hover:text-warning transition">
                        {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="ta-btn flex w-full items-center justify-center gap-2 rounded-lg bg-warning p-3.5 font-semibold text-boxdark-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? <><Spinner /> Authenticating…</> : "Continue →"}
                  </button>
                </form>
              </div>
            

            {/* Footer links */}
            <div className="mt-7 pt-6 border-t border-strokedark text-center space-y-2.5">
              <Link to="/forgot-password" className="block text-sm text-bodydark hover:text-secondary transition">Forgot your password?</Link>
              <Link to="/login" className="block text-sm text-bodydark hover:text-secondary transition">Sign in as Employee / Admin →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
      <svg className="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-sm font-medium text-danger">{msg}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}