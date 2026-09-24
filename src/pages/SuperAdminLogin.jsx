import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { clearAllCache } from "../data/axiosConfig";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

// ── 6-box OTP input ────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputRefs = Array.from({ length: 6 }, () => useRef(null));
  const digits = value.padEnd(6, " ").split("");

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next  = digits.slice();
    next[i]     = digit || " ";
    onChange(next.join(""));
    if (digit && i < 5) inputRefs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      const next = digits.slice();
      if (digits[i].trim()) {
        next[i] = " ";
        onChange(next.join(""));
      } else if (i > 0) {
        inputRefs[i - 1].current?.focus();
      }
    }
    if (e.key === "ArrowLeft"  && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < 5) inputRefs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, " ").slice(0, 6));
    inputRefs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-[52px] text-center text-xl font-bold rounded-lg border bg-boxdark-2 text-white transition-all
                     border-strokedark focus:border-warning focus:ring-2 focus:ring-warning/20 outline-none
                     disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function SuperAdminLogin() {
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [step,           setStep]           = useState(1);       // 1 = credentials, 2 = OTP
  const [pendingEmail,   setPendingEmail]   = useState("");
  const [otp,            setOtp]            = useState("      "); // 6 spaces default
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [info,           setInfo]           = useState("");
  const navigate = useNavigate();

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (step === 2 && otp.trim().length === 6) handleVerify();
  }, [otp]);

  // ── Step 1: validate credentials → send OTP ──────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true); setError(""); setInfo("");
    try {
      const res = await api.post("/superadmin/login", { email, password });
      setPendingEmail(res.data.email || email);
      if (res.data.otp) {
        setOtp(String(res.data.otp));
      } else {
        setOtp("      ");
      }
      setStep(2);
      setInfo(`OTP sent to ${res.data.email || email}. Valid for ${res.data.expiresInMin ?? 10} minutes.`);
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP → get JWT ─────────────────────────────────────────
  const handleVerify = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) return setError("Please enter all 6 digits.");
    setLoading(true); setError("");
    try {
      const res = await api.post("/superadmin/verify-otp", { email: pendingEmail, otp: cleanOtp });

      // Wipe any responses cached under a previous session on this tab before
      // storing the new token — otherwise this super admin can briefly see
      // whatever company's data was cached from the previous session.
      clearAllCache();

      localStorage.setItem("token", res.data.token);

      // FIX: backend may return either flat companyId/companyName fields
      // (preferred) or only a populated `company` object ({ _id, name, ... }).
      // Previously this read res.data.companyId directly, which was always
      // undefined when only `company` was returned — resulting in an empty
      // companyId being stored. AdminChat's extractCompanyId() then resolved
      // to '', so super_admin_join's `if (!adminId || !company) return;`
      // guard silently aborted, leaving the chat panel with "0 online" and
      // "No contacts yet" forever.
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
      // Notify same-tab listeners (window 'storage' event doesn't fire in the same tab)
      window.dispatchEvent(new Event("user_changed"));
      toast.success("Super Admin login successful! Welcome back.");
      navigate("/superadmin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError("");
    try {
      const res = await api.post("/superadmin/resend-otp", { email: pendingEmail });
      if (res.data.otp) {
        setOtp(String(res.data.otp));
      } else {
        setOtp("      ");
      }
      setInfo(res.data.message || "New OTP sent.");
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
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
              Two-factor verification is required for every sign-in.
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
              <div className="ml-auto flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? "bg-warning" : "bg-warning/40"}`}/>
                <div className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? "bg-warning" : "bg-strokedark"}`}/>
              </div>
            </div>

            {/* ── Step 1: Credentials ─────────────────────────────────────────── */}
            {step === 1 && (
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
            )}

            {/* ── Step 2: OTP verification ──────────────────────────────────── */}
            {step === 2 && (
              <div className="slide-in">
                <h1 className="text-2xl font-bold text-white mb-1">Verify your email</h1>
                <p className="text-sm text-bodydark mb-0.5">OTP sent to</p>
                <p className="text-sm font-semibold text-warning mb-6 break-all">{pendingEmail}</p>

                {error && <ErrorBanner msg={error} />}
                {info && !error && (
                  <div className="mb-5 px-4 py-3 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm text-success">{info}</p>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                  <div>
                    <label className="block mb-4 font-medium text-white text-center">
                      Enter 6-digit OTP
                    </label>
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                  </div>

                  <button type="submit" disabled={loading || otp.trim().length !== 6}
                    className="ta-btn w-full py-3.5 rounded-lg bg-warning text-boxdark-2 font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? <><Spinner /> Verifying…</> : "Verify & Sign In"}
                  </button>
                </form>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                    className="text-sm font-medium text-warning hover:text-warning/80 disabled:text-bodydark disabled:cursor-not-allowed transition">
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive it? Resend OTP"}
                  </button>
                  <button onClick={() => { setStep(1); setError(""); setInfo(""); setOtp("      "); }}
                    className="text-sm text-bodydark hover:text-white transition flex items-center gap-1">
                    ← Back to login
                  </button>
                </div>
              </div>
            )}

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