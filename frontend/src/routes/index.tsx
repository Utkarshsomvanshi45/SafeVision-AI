import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera, Monitor, ShieldCheck, BellRing, BarChart3, ArrowRight, Play,
  Cpu, AlertTriangle, CheckCircle, X, Heart, Award, Leaf, Users,
} from "lucide-react";
import { SafeVisionLogo } from "@/assets/SafeVisionLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeVision AI by AMNS — Intelligent Safety. Stronger Tomorrow." },
      { name: "description", content: "AI-powered vision system designed for AMNS facilities to detect risks, ensure compliance, and protect people and operations." },
      { property: "og:title", content: "SafeVision AI by AMNS" },
      { property: "og:description", content: "Smart Vision. Safer Workplaces." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white font-sans">
      <Navbar onDemo={() => setDemoOpen(true)} />
      <Hero onDemo={() => setDemoOpen(true)} />
      <Features />
      <HowItWorks />
      <AmnsBrand />
      <Footer />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}

/* -------------------- Navbar -------------------- */
function Navbar({ onDemo }: { onDemo: () => void }) {
  const NAV = [
    { label: "Home", id: "home" },
    { label: "Features", id: "features" },
    { label: "Solutions", id: "solutions" },
    { label: "Technology", id: "technology" },
    { label: "About AMNS", id: "about" },
    { label: "Contact", id: "contact" },
  ];
  const scroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <header className="sticky top-0 z-40 h-16 bg-[#0A0E1A]/95 backdrop-blur border-b border-white/[0.08]">
      <div className="h-full max-w-[1440px] mx-auto flex items-center px-6 gap-8">
        <button onClick={() => scroll("home")} className="flex items-center gap-3">
          <span className="font-display font-bold text-[24px] text-[#E1261C] tracking-tight">AMNS</span>
          <span className="hidden sm:block text-[11px] text-gray-400 leading-tight">ArcelorMittal<br/>Nippon Steel India</span>
        </button>
        <nav className="hidden lg:flex items-center gap-7 ml-6">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => scroll(n.id)} className="text-[13px] text-gray-300 hover:text-white transition">
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/login" className="hidden sm:inline-flex h-9 items-center px-4 border border-white/30 text-white text-[13px] rounded hover:bg-white/5">Sign In</Link>
          <button onClick={onDemo} className="inline-flex h-9 items-center gap-1.5 px-4 bg-[#E1261C] text-white text-[13px] font-medium rounded hover:bg-[#c61f17]">
            Request a Demo <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------- Hero -------------------- */
function Hero({ onDemo }: { onDemo: () => void }) {
  const stats = [
    { icon: Camera, num: "500+", label: "Cameras Monitored", sub: "Across AMNS Facilities" },
    { icon: ShieldCheck, num: "92%", label: "Compliance Rate", sub: "Across Sites" },
    { icon: AlertTriangle, num: "23K+", label: "Alerts Resolved", sub: "This Month" },
    { icon: Users, num: "10K+", label: "Lives Protected", sub: "Every Day" },
  ];
  const pills = [
    { icon: Camera, t: "AI-Powered Detection", d: "Advanced computer vision models detect unsafe conditions and prevent incidents in real-time." },
    { icon: Monitor, t: "Real-time Monitoring", d: "24/7 monitoring of all critical areas across plants with live alerts and instant notifications." },
    { icon: ShieldCheck, t: "PPE & Compliance", d: "Ensure adherence to safety protocols and compliance with industry regulations automatically." },
    { icon: BellRing, t: "Instant Alerts", d: "Real-time alerts for safety violations and incidents to enable quick response and action." },
    { icon: BarChart3, t: "Data-Driven Insights", d: "Powerful analytics and dashboards to identify trends and improve safety performance." },
  ];

  return (
    <section id="home" className="relative pt-12 pb-6 px-6">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 60% 40%, rgba(225,38,28,0.18), transparent 55%), radial-gradient(ellipse at 30% 60%, rgba(13,158,117,0.12), transparent 60%)",
        }}
      />
      <div className="relative max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-[#E1261C] mb-4">
              SAFEVISION AI BY AMNS
            </div>
            <h1 className="font-display font-bold text-white leading-[1.05] text-[44px] md:text-[54px]">
              Intelligent Safety.<br />
              <span className="text-[#E1261C]">Stronger</span> Tomorrow.
            </h1>
            <p className="mt-6 text-[16px] md:text-[17px] text-gray-400 max-w-[480px] leading-[1.6]">
              AI-powered vision system designed for AMNS facilities to detect risks, ensure compliance, and protect our people and operations.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={onDemo} className="inline-flex items-center gap-2 px-6 h-12 bg-[#E1261C] hover:bg-[#c61f17] text-white text-[14px] font-semibold rounded">
                Request a Demo <ArrowRight size={15} />
              </button>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 h-12 border border-white/30 text-white text-[14px] rounded hover:bg-white/5">
                Explore Solutions <Play size={13} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Right visual — simulated camera frame */}
          <CameraFrameVisual />
        </div>

        {/* Right stat cards */}
        <div className="space-y-3 max-w-sm mx-auto lg:mx-0 w-full">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[#141A2A]/80 border border-white/[0.08] rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[rgba(225,38,28,0.12)] flex items-center justify-center">
                  <Icon size={18} className="text-[#E1261C]" />
                </div>
                <div className="leading-tight">
                  <div className="font-display font-bold text-[22px] text-white">{s.num}</div>
                  <div className="text-[12px] text-gray-300 font-medium">{s.label}</div>
                  <div className="text-[10.5px] text-gray-500 mt-0.5">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature pills row */}
      <div className="relative max-w-[1440px] mx-auto mt-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-[rgba(20,26,42,0.7)] border border-white/[0.08] rounded-xl p-4">
          {pills.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.t} className="flex items-start gap-2.5 p-2">
                <div className="w-9 h-9 shrink-0 rounded bg-[rgba(225,38,28,0.12)] flex items-center justify-center">
                  <Icon size={16} className="text-[#E1261C]" />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-white leading-tight">{p.t}</div>
                  <div className="text-[10.5px] text-gray-400 mt-1 leading-snug">{p.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CameraFrameVisual() {
  return (
    <div className="relative" style={{ transform: "rotate(-1deg)" }}>
      <div className="relative bg-[#1C2333] border border-[#2D3A52] rounded-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        {/* header */}
        <div className="h-9 bg-[#0F1623] border-b border-[#2D3A52] flex items-center justify-between px-3">
          <span className="text-[11px] font-mono text-gray-300">Blast Furnace Area — Camera 04</span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#E1261C]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E1261C] animate-pulse" /> LIVE
          </span>
        </div>
        {/* scene */}
        <div className="relative h-[260px] bg-gradient-to-br from-[#1a2638] via-[#0c1424] to-[#06090f] overflow-hidden">
          {/* faux scan lines */}
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)" }} />
          {/* worker 1 */}
          <Worker x="22%" y="38%" />
          {/* worker 2 */}
          <Worker x="58%" y="44%" />
          {/* worker 3 - no helmet */}
          <Worker x="78%" y="42%" noHat />
          {/* green box 1 */}
          <BBox x="15%" y="34%" w="22%" h="50%" color="#16A34A" label="Worker · Compliant" conf="94%" />
          <BBox x="51%" y="40%" w="20%" h="48%" color="#16A34A" label="Worker · Compliant" conf="89%" />
          <BBox x="72%" y="38%" w="20%" h="52%" color="#E1261C" label="⚠ No Helmet" conf="91%" />
        </div>
      </div>
      {/* floating alert */}
      <div
        className="absolute -top-3 -right-3 bg-white text-[#111827] rounded-md p-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-l-4 border-[#E1261C] w-56"
        style={{ transform: "rotate(2deg)" }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#E1261C] font-bold">
          <AlertTriangle size={11} /> NO HELMET DETECTED
        </div>
        <div className="text-[11.5px] font-semibold mt-1">Zone B · Line 3</div>
        <div className="text-[10px] text-gray-500 font-mono mt-1">09:18:42 IST</div>
      </div>
    </div>
  );
}

function Worker({ x, y, noHat }: { x: string; y: string; noHat?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {!noHat && <div className="w-3 h-1.5 bg-[#F59E0B] rounded-t mx-auto -mb-px" />}
      <div className="w-3 h-3 rounded-full bg-black/70 mx-auto" />
      <div className="w-6 h-12 bg-[#E1261C]/60 rounded-sm mt-0.5 mx-auto" />
    </div>
  );
}

function BBox({ x, y, w, h, color, label, conf }: any) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width: w, height: h, border: `2px solid ${color}`, boxShadow: `0 0 12px ${color}55` }}
    >
      <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[9px] font-mono text-white font-semibold whitespace-nowrap" style={{ background: color }}>
        {label} · {conf}
      </div>
    </div>
  );
}


/* -------------------- Features -------------------- */
function Features() {
  const items = [
    { icon: Cpu, t: "AI-Powered Detection", d: "Advanced computer vision models for real-time risk detection across the plant." },
    { icon: Monitor, t: "Real-time Monitoring", d: "24/7 surveillance across every critical area, with sub-second alerting." },
    { icon: ShieldCheck, t: "PPE & Compliance", d: "Ensure adherence to safety protocols and industry standards automatically." },
    { icon: BellRing, t: "Instant Alerts", d: "Real-time notifications to the right people to prevent incidents before escalation." },
    { icon: BarChart3, t: "Data-Driven Insights", d: "Actionable analytics and predictive intelligence to improve safety performance." },
  ];
  return (
    <section id="features" className="bg-white text-[#0F172A] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold">POWERFUL FEATURES</div>
          <h2 className="font-display font-bold text-[32px] md:text-[38px] mt-2">Everything you need for a safer workplace</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mt-12">
          {items.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.t} className="bg-white border border-gray-100 rounded-lg p-5 hover:shadow-lg hover:border-[#E1261C]/30 transition">
                <div className="w-11 h-11 rounded bg-[#FEE2E2] flex items-center justify-center">
                  <Icon size={20} className="text-[#E1261C]" />
                </div>
                <h3 className="font-display font-bold text-[15px] mt-4">{f.t}</h3>
                <p className="text-[12.5px] text-gray-500 mt-2 leading-[1.55]">{f.d}</p>
                <Link to="/login" className="inline-flex items-center gap-1 mt-3 text-[12px] text-[#E1261C] font-semibold hover:underline">
                  Learn more <ArrowRight size={12} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------- How It Works -------------------- */
function HowItWorks() {
  const steps = [
    { icon: Camera, color: "#0891B2", n: 1, t: "CCTV Feed", d: "Live RTSP streams from plant cameras into the AI pipeline." },
    { icon: Cpu, color: "#2563EB", n: 2, t: "AI Processing", d: "YOLOv8 Safety v2.1 analyzes frames in real-time at sub-200ms latency." },
    { icon: AlertTriangle, color: "#D97706", n: 3, t: "Violation Detected", d: "Rule engine identifies safety violations and assigns severity." },
    { icon: CheckCircle, color: "#16A34A", n: 4, t: "Alert & Action", d: "Notification sent, response logged, and incident tracked to resolution." },
  ];
  return (
    <section id="solutions" className="bg-[#0F1520] text-white py-20 px-6" data-section="technology">
      <div className="max-w-6xl mx-auto">
        <div className="text-center" id="technology">
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold">HOW IT WORKS</div>
          <h2 className="font-display font-bold text-[32px] md:text-[38px] mt-2">From Camera to Compliance</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-12 relative">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.t} className="relative bg-[#1C2333] border border-white/10 rounded-lg p-5">
                <div className="absolute right-3 top-2 font-display font-bold text-[60px] leading-none opacity-10" style={{ color: s.color }}>{s.n}</div>
                <div className="w-11 h-11 rounded flex items-center justify-center" style={{ background: `${s.color}25` }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <h3 className="font-display font-bold text-[15px] mt-4 text-white">{s.t}</h3>
                <p className="text-[12.5px] text-gray-400 mt-2 leading-[1.55]">{s.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------- AMNS Brand -------------------- */
function AmnsBrand() {
  const commit = [
    { icon: Heart, t: "Zero Harm", d: "Protecting every life, every day." },
    { icon: Award, t: "Operational Excellence", d: "Driving efficiency with innovation." },
    { icon: Leaf, t: "Sustainable Future", d: "Building a responsible tomorrow." },
    { icon: Users, t: "People First", d: "Our people are our greatest strength." },
  ];
  return (
    <section id="about" className="bg-white text-[#0F172A] py-16 px-6">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16 items-center">
        <div>
          <svg width="120" height="36" viewBox="0 0 120 36"><path d="M5 28 Q30 8 60 18 Q90 28 115 12" stroke="#E1261C" strokeWidth="3" fill="none" /><path d="M105 12 L115 12 L113 22 Z" fill="#E1261C"/></svg>
          <div className="font-display font-bold text-[18px] mt-3">
            <span className="text-[#E1261C]">ArcelorMittal</span>
          </div>
          <div className="font-display font-bold text-[24px] mt-2">Built on Strength.<br/>Driven by Responsibility.</div>
          <div className="w-12 h-0.5 bg-[#E1261C] mt-3" />
          <p className="text-[13px] text-gray-500 mt-4 leading-[1.7] max-w-lg">
            SafeVision AI is an AMNS initiative to build a safer, smarter, and more sustainable future for our people, our operations, and our communities. Deployed at AM/NS India, Talegaon — protecting workers with real-time AI-powered safety monitoring.
          </p>
          <Link to="/login" className="inline-flex items-center gap-1 mt-5 text-[13px] text-[#E1261C] font-semibold hover:underline">About AMNS <ArrowRight size={13}/></Link>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold">OUR COMMITMENT</div>
          <div className="mt-4 space-y-5">
            {commit.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.t} className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded bg-[#FEE2E2] flex items-center justify-center">
                    <Icon size={16} className="text-[#E1261C]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[13.5px]">{c.t}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5">{c.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}


/* -------------------- Footer -------------------- */
function Footer() {
  const navigate = useNavigate();

  const isLoggedIn = () => !!localStorage.getItem("token");

  const goToApp = (path: string) => {
    if (isLoggedIn()) {
      navigate({ to: path as any });
    } else {
      toast("Please sign in to access the platform", {
        icon: "🔒",
        action: { label: "Sign In", onClick: () => navigate({ to: "/login" }) },
      });
    }
  };

  const PLATFORM_LINKS = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Live Monitor", path: "/live" },
    { label: "Alert Center", path: "/alerts" },
    { label: "Analytics", path: "/analytics" },
    { label: "Reports", path: "/reports" },
  ];

  return (
    <footer id="contact" className="bg-[#0A0E1A] border-t border-white/[0.08] py-10 px-6">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <SafeVisionLogo />
          <p className="text-[12px] text-gray-500 mt-3 leading-[1.6]">
            Intelligent Safety. Stronger Tomorrow.<br/>Smart Vision. Safer Workplaces.
          </p>
          <p className="text-[11px] text-gray-600 mt-3">© 2024 ArcelorMittal Nippon Steel India. All rights reserved.</p>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3">PLATFORM</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.path}>
                <button onClick={() => goToApp(l.path)} className="hover:text-white text-left">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3">COMPANY</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            <li><a href="https://www.amns.in" target="_blank" rel="noreferrer" className="hover:text-white">AM/NS India</a></li>
            <li><a href="#about" className="hover:text-white">Safety & HSE</a></li>
            <li><a href="mailto:support@amns.in" className="hover:text-white">Contact Support</a></li>
            <li><button onClick={() => toast("Privacy policy — coming soon")} className="hover:text-white">Privacy Policy</button></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3">SUPPORT</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            <li><button onClick={() => toast("Documentation — coming soon")} className="hover:text-white">Documentation</button></li>
            <li><button onClick={() => toast("API Reference — coming soon")} className="hover:text-white">API Reference</button></li>
            <li><button onClick={() => toast("Help Center — coming soon")} className="hover:text-white">Help Center</button></li>
            <li><a href="mailto:it-support@amns.in" className="hover:text-white">Contact IT Support</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1320px] mx-auto mt-8 pt-6 border-t border-white/[0.05] text-[11px] text-gray-600 text-center">
        Powered by innovation. Driven by responsibility. Committed to our people. — AMNS
      </div>
    </footer>
  );
}

/* -------------------- Demo Modal -------------------- */
function DemoModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Demo request submitted. We'll be in touch within 24 hours.");
      onClose();
    }, 1200);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-[#1C2333] border border-[#2D3A52] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[18px] text-white">Request a Demo</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <DarkInput label="Full Name" required />
          <DarkInput label="Work Email" type="email" required />
          <DarkInput label="Company" defaultValue="AM/NS India" />
          <div>
            <label className="block text-[11.5px] text-gray-400 mb-1">Message</label>
            <textarea rows={3} className="w-full bg-[#0F1623] border border-[#2D3A52] rounded px-3 py-2 text-[13px] text-white outline-none focus:border-[#E1261C]" />
          </div>
        </div>
        <button disabled={loading} className="mt-5 w-full h-11 bg-[#E1261C] hover:bg-[#c61f17] text-white font-semibold text-[13px] rounded disabled:opacity-60">
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

export function DarkInput({ label, ...rest }: any) {
  return (
    <div>
      <label className="block text-[11.5px] text-gray-400 mb-1">{label}</label>
      <input {...rest} className="w-full h-10 bg-[#0F1623] border border-[#2D3A52] rounded px-3 text-[13px] text-white outline-none focus:border-[#E1261C]" />
    </div>
  );
}
