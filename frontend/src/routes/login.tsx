import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Eye, EyeOff, ShieldCheck, Monitor, Users, BellRing, ArrowRight, KeyRound, Lock } from "lucide-react";
import { SafeVisionLogo } from "@/assets/SafeVisionLogo";
import { authAPI, BASE_URL } from '@/lib/api';
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — SafeVision AI by AMNS" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white grid grid-cols-1 lg:grid-cols-[45fr_55fr]">
      <AuthLeftPanel />
      <LoginRight />
    </div>
  );
}

function LoginRight() {
  const navigate   = useNavigate();
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [mustChangePw, setMustChangePw] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authAPI.login(email.trim(), password);
      localStorage.setItem("token", data.access_token);
      if (data.user) {
        localStorage.setItem("sv_user", JSON.stringify(data.user));
      }
      if (data.user?.must_change_password) {
        // Show forced password change modal — don't navigate yet
        setMustChangePw(true);
        toast("Please set a new password before continuing", { icon: "🔐" });
      } else {
        toast.success("Signed in successfully");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      const msg = err?.message || "Invalid email or password. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (mustChangePw) {
    return <ForceChangePassword onSuccess={() => { toast.success("Password updated — welcome!"); navigate({ to: "/dashboard" }); }} />;
  }

  return (
    <div className="bg-[#111827] flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-[440px] bg-[#1C2333] border border-[#2D3A52] rounded-2xl p-8 lg:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col items-center">
          <SafeVisionLogo />
          <div className="text-[10px] tracking-[0.25em] text-gray-500 mt-2 font-semibold">BY AMNS</div>
        </div>
        <h1 className="font-display font-bold text-[26px] text-white text-center mt-7">Welcome Back</h1>
        <p className="text-[13px] text-gray-400 text-center mt-1">Sign in to your SafeVision AI account</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="block text-[12.5px] text-white font-medium mb-1.5">Email / Username</label>
            <div className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                autoComplete="username"
                className="w-full h-11 bg-[#0F1623] border border-[#2D3A52] rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600"
              />
              <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] text-white font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full h-11 bg-[#0F1623] border border-[#2D3A52] rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ background: "rgba(225,38,28,0.12)", border: "1px solid rgba(225,38,28,0.35)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "#FCA5A5" }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-between text-[12.5px]">
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
              <input type="checkbox" className="accent-[#E1261C]" /> Remember me
            </label>
            <button type="button" className="text-[#E1261C] font-semibold hover:underline">Forgot Password?</button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#E1261C] hover:bg-[#c61f17] text-white font-semibold text-[14px] rounded flex items-center justify-center gap-2 disabled:opacity-70 transition"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Signing in...
              </>
            ) : (
              <>Sign In <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11.5px] text-gray-500">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button className="w-full h-11 border border-white/20 text-white rounded text-[13px] flex items-center justify-center gap-2 hover:bg-white/5">
          <ShieldCheck size={14} /> Sign in with AMNS SSO
        </button>

        <div className="text-center text-[12.5px] text-gray-400 mt-5">
          Need help? <a href="mailto:it-support@amns.in" className="text-[#E1261C] font-semibold hover:underline">Contact IT Support</a>
        </div>
        <div className="text-center text-[12.5px] text-gray-400 mt-2">
          Don't have an account? <Link to="/signup" className="text-[#E1261C] font-semibold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

// ── Forced password change screen (shown after first login with temp password) ─
function ForceChangePassword({ onSuccess }: { onSuccess: () => void }) {
  const [current, setCurrent]     = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showCur, setShowCur]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showCon, setShowCon]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !newPw || !confirm) { setError("All fields are required"); return; }
    if (newPw.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (newPw !== confirm) { setError("Passwords do not match"); return; }
    if (newPw === current) { setError("New password must be different from current password"); return; }
    setError(""); setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to change password"); return; }
      // Update stored user to clear the flag
      try {
        const u = JSON.parse(localStorage.getItem("sv_user") || "{}");
        localStorage.setItem("sv_user", JSON.stringify({ ...u, must_change_password: false }));
      } catch {}
      onSuccess();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const strength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : /[^a-zA-Z0-9]/.test(newPw) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#E1261C", "#D97706", "#2563EB", "#16A34A"];

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(225,38,28,0.12), transparent 60%)" }} />
      <div className="relative w-full max-w-[460px]">
        {/* Security badge */}
        <div className="flex flex-col items-center mb-8">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(225,38,28,0.12)", border: "2px solid rgba(225,38,28,0.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <KeyRound size={28} color="#E1261C" />
          </div>
          <h1 className="font-display font-bold text-white text-[24px] text-center">Set Your Password</h1>
          <p className="text-[13px] text-gray-400 text-center mt-2 max-w-[320px] leading-[1.6]">
            You're using a temporary password. Please set a new secure password to continue.
          </p>
        </div>

        <div className="bg-[#1C2333] border border-[#2D3A52] rounded-2xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
          {/* Mandatory notice */}
          <div style={{ background: "rgba(225,38,28,0.08)", border: "1px solid rgba(225,38,28,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Lock size={14} color="#E1261C" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.6 }}>
              This step is <strong>mandatory</strong>. Your temporary password must be changed before you can access the dashboard.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Current (temp) password */}
            <div>
              <label className="block text-[12.5px] text-white font-medium mb-1.5">Temporary Password (from email)</label>
              <div className="relative">
                <input type={showCur ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)}
                  placeholder="Enter temporary password" autoComplete="current-password"
                  className="w-full h-11 bg-[#0F1623] border border-[#2D3A52] rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600" />
                <button type="button" onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-[12.5px] text-white font-medium mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  className="w-full h-11 bg-[#0F1623] border border-[#2D3A52] rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {newPw.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor[strength] : "#2D3A52", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColor[strength], marginTop: 4 }}>{strengthLabel[strength]}</div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-[12.5px] text-white font-medium mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input type={showCon ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter new password" autoComplete="new-password"
                  className={`w-full h-11 bg-[#0F1623] border rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600 ${confirm && confirm !== newPw ? "border-[#E1261C]" : "border-[#2D3A52]"}`} />
                <button type="button" onClick={() => setShowCon(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showCon ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirm && confirm !== newPw && <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 4 }}>Passwords don't match</p>}
            </div>

            {error && (
              <div style={{ background: "rgba(225,38,28,0.12)", border: "1px solid rgba(225,38,28,0.35)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "#FCA5A5" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 bg-[#E1261C] hover:bg-[#c61f17] text-white font-semibold text-[14px] rounded flex items-center justify-center gap-2 disabled:opacity-70 transition mt-2">
              {loading ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>Updating...</>
              ) : (
                <><KeyRound size={15} /> Set New Password & Continue</>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-gray-600 mt-4">SafeVision AI · AMNS Security Policy</p>
      </div>
    </div>
  );
}

export function Field({ label, icon: Icon, iconClickable, onIconClick, ...rest }: any) {
  return (
    <div>
      <label className="block text-[12.5px] text-white font-medium mb-1.5">{label}</label>
      <div className="relative">
        <input {...rest} className="w-full h-11 bg-[#0F1623] border border-[#2D3A52] rounded px-3 pr-10 text-[13.5px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600" />
        {Icon && (
          iconClickable
            ? <button type="button" onClick={onIconClick} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><Icon size={15} /></button>
            : <Icon size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
        )}
      </div>
    </div>
  );
}

export function AuthLeftPanel() {
  const features = [
    { icon: ShieldCheck, t: "AI-Powered Detection",  d: "Advanced AI models detect unsafe conditions and prevent incidents in real time." },
    { icon: Monitor,     t: "Real-time Monitoring",  d: "24/7 monitoring across all critical areas with live alerts and notifications." },
    { icon: Users,       t: "Compliance & Standards", d: "Ensure adherence to safety protocols and industry regulations automatically." },
    { icon: BellRing,    t: "Instant Alerts",        d: "Get instant alerts and take quick action to keep everyone safe." },
  ];
  return (
    <div className="relative bg-[#0A0E1A] p-8 lg:p-12 flex flex-col overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse at 30% 70%, rgba(225,38,28,0.25), transparent 55%)" }} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-[22px] text-[#E1261C]">AMNS</span>
          <span className="text-[11.5px] text-gray-400">ArcelorMittal Nippon Steel India</span>
        </div>
        <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold mt-10">SAFEVISION AI BY AMNS</div>
        <h2 className="font-display font-bold text-white text-[34px] md:text-[42px] leading-[1.1] mt-3">
          Intelligent Safety.<br /><span className="text-[#E1261C]">Stronger Tomorrow.</span>
        </h2>
        <div className="w-12 h-0.5 bg-[#E1261C] mt-4" />
        <p className="text-[13.5px] text-gray-400 mt-5 max-w-md leading-[1.6]">
          AI-powered vision system that helps AMNS facilities detect risks, ensure compliance, and protect our people and operations.
        </p>
        <div className="mt-10 space-y-4 max-w-md">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.t} className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded bg-[rgba(225,38,28,0.15)] flex items-center justify-center">
                  <Icon size={16} className="text-[#E1261C]" />
                </div>
                <div>
                  <div className="font-semibold text-white text-[13.5px]">{f.t}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5 leading-[1.55]">{f.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative mt-auto pt-8">
        <div className="grid grid-cols-4 gap-3 max-w-md">
          {[["24+","Locations"],["15K+","Employees"],["500+","Cameras"],["23K+","Alerts Resolved"]].map(([n,l]) => (
            <div key={l}>
              <div className="font-display font-bold text-[20px] text-[#E1261C]">{n}</div>
              <div className="text-[10.5px] text-gray-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <div className="text-[10.5px] text-gray-500 mt-6 leading-[1.6]">
          Powered by innovation. Driven by responsibility. Committed to our people.
        </div>
      </div>
    </div>
  );
}
