import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera, Monitor, ShieldCheck, BellRing, BarChart3, ArrowRight, Play,
  Cpu, AlertTriangle, CheckCircle, X, Heart, Award, Leaf, Users, Menu,
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
    <div className="min-h-screen bg-[#0A0E1A] text-white font-sans selection:bg-[#E1261C]/30 selection:text-white overflow-x-hidden">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV = [
    { label: "Home", id: "home" },
    { label: "Features", id: "features" },
    { label: "Solutions", id: "solutions" },
    { label: "Technology", id: "technology" },
    { label: "About AMNS", id: "about" },
    { label: "Contact", id: "contact" },
  ];

  const scroll = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#0A0E1A]/95 backdrop-blur-md border-b border-white/[0.08] transition-all">
      <div className="h-full max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 gap-4">
        {/* Brand logo */}
        <button onClick={() => scroll("home")} className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none">
          <span className="font-display font-black text-[22px] sm:text-[24px] text-[#E1261C] tracking-tight">AMNS</span>
          <div className="flex flex-col border-l border-white/15 pl-2.5 sm:pl-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-200 leading-tight">ArcelorMittal</span>
            <span className="text-[9px] sm:text-[10px] text-gray-400 leading-tight">Nippon Steel India</span>
          </div>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 ml-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => scroll(n.id)}
              className="text-[13px] font-medium text-gray-300 hover:text-white transition-colors cursor-pointer py-1"
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="inline-flex h-9 items-center px-3.5 sm:px-4 border border-white/20 text-gray-200 text-[12.5px] sm:text-[13px] font-medium rounded-md hover:bg-white/5 hover:text-white transition-all"
          >
            Sign In
          </Link>

          <button
            onClick={onDemo}
            className="inline-flex h-9 items-center gap-1.5 px-3 sm:px-4 bg-[#E1261C] hover:bg-[#c61f17] text-white text-[12.5px] sm:text-[13px] font-semibold rounded-md shadow-sm transition-all cursor-pointer"
          >
            <span className="hidden xs:inline">Request a</span> Demo <ArrowRight size={13} />
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-[#0E1424] border-b border-white/10 shadow-2xl p-5 backdrop-blur-xl z-50 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => scroll(n.id)}
                className="text-left text-[14px] font-medium text-gray-200 hover:text-white hover:bg-white/5 py-2.5 px-3 rounded-md transition-all flex items-center justify-between"
              >
                <span>{n.label}</span>
                <ArrowRight size={13} className="text-gray-500" />
              </button>
            ))}

            <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-10 border border-white/20 text-white rounded-md text-[13px] font-medium flex items-center justify-center hover:bg-white/5"
              >
                Sign In
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onDemo();
                }}
                className="w-full h-10 bg-[#E1261C] text-white rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#c61f17]"
              >
                Request a Demo <ArrowRight size={14} />
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* -------------------- Hero -------------------- */
function Hero({ onDemo }: { onDemo: () => void }) {
  const stats = [
    { icon: Camera, num: "500+", label: "Cameras Monitored", sub: "Across AMNS Facilities" },
    { icon: ShieldCheck, num: "92%", label: "Compliance Rate", sub: "Across All Sites" },
    { icon: AlertTriangle, num: "23K+", label: "Alerts Resolved", sub: "This Month" },
    { icon: Users, num: "10K+", label: "Lives Protected", sub: "Every Single Day" },
  ];

  const pills = [
    { icon: Camera, t: "AI-Powered Detection", d: "Sub-200ms computer vision models detect unsafe risks in real time." },
    { icon: Monitor, t: "Real-time Monitoring", d: "24/7 continuous stream analytics across hazardous plant zones." },
    { icon: ShieldCheck, t: "PPE & Compliance", d: "Instant helmet, vest, footwear, and zone boundary enforcement." },
    { icon: BellRing, t: "Instant Alerts", d: "Automated escalation to on-duty safety managers and plant leaders." },
    { icon: BarChart3, t: "Data-Driven Insights", d: "Real-time compliance heatmaps, predictive trends, and audits." },
  ];

  return (
    <section id="home" className="relative pt-8 sm:pt-12 pb-10 px-4 sm:px-6">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 60% 30%, rgba(225,38,28,0.2), transparent 55%), radial-gradient(ellipse at 30% 60%, rgba(13,158,117,0.15), transparent 60%)",
        }}
      />

      <div className="relative max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 xl:gap-12 items-start">
          {/* Main Hero column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E1261C]/10 border border-[#E1261C]/25 text-[11px] font-semibold tracking-wider text-[#E1261C] mb-4 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E1261C] animate-pulse" />
                SafeVision AI by AMNS
              </div>
              <h1 className="font-display font-extrabold text-white leading-[1.08] text-[32px] sm:text-[42px] md:text-[48px] lg:text-[52px] tracking-tight">
                Intelligent Safety.<br />
                <span className="text-[#E1261C]">Stronger</span> Tomorrow.
              </h1>
              <p className="mt-4 sm:mt-6 text-[14.5px] sm:text-[16px] text-gray-300 max-w-[480px] leading-relaxed">
                AI-powered vision system engineered for AMNS facilities to detect hazards, enforce PPE compliance, and safeguard workforce operations in real time.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
                <button
                  onClick={onDemo}
                  className="inline-flex items-center justify-center gap-2 px-6 h-11 sm:h-12 bg-[#E1261C] hover:bg-[#c61f17] text-white text-[13.5px] sm:text-[14px] font-semibold rounded-md shadow-lg shadow-[#E1261C]/25 transition-all cursor-pointer"
                >
                  Request a Demo <ArrowRight size={15} />
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 h-11 sm:h-12 border border-white/20 text-gray-200 hover:text-white text-[13.5px] sm:text-[14px] font-medium rounded-md hover:bg-white/5 transition-all"
                >
                  Explore Solutions <Play size={13} className="ml-1 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Simulated Live Camera Frame */}
            <div className="w-full">
              <CameraFrameVisual />
            </div>
          </div>

          {/* Stats Cards — 2x2 grid on mobile/tablet, vertical stack on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3.5 w-full">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="bg-[#141A2A]/90 border border-white/[0.08] rounded-xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-3.5 shadow-sm hover:border-white/15 transition-all"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[rgba(225,38,28,0.12)] border border-[rgba(225,38,28,0.2)] flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[#E1261C]" />
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="font-display font-bold text-[19px] sm:text-[22px] text-white truncate">{s.num}</div>
                    <div className="text-[11.5px] sm:text-[12px] text-gray-300 font-medium truncate">{s.label}</div>
                    <div className="text-[9.5px] sm:text-[10px] text-gray-400 mt-0.5 truncate hidden xs:block">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature pills row — responsive 1/2/5 column grid */}
        <div className="relative mt-8 sm:mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[rgba(20,26,42,0.85)] border border-white/[0.08] rounded-xl p-3 sm:p-4 shadow-inner">
            {pills.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.t} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-md bg-[rgba(225,38,28,0.12)] flex items-center justify-center">
                    <Icon size={16} className="text-[#E1261C]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] sm:text-[12.5px] font-semibold text-white leading-tight truncate">{p.t}</div>
                    <div className="text-[10.5px] text-gray-400 mt-1 leading-snug line-clamp-2">{p.d}</div>
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

function CameraFrameVisual() {
  return (
    <div className="relative w-full max-w-full">
      <div className="relative bg-[#1C2333] border border-[#2D3A52] rounded-xl overflow-hidden shadow-2xl transition-transform md:rotate-[-0.75deg]">
        {/* Stream header */}
        <div className="h-9 bg-[#0F1623] border-b border-[#2D3A52] flex items-center justify-between px-3">
          <span className="text-[10.5px] sm:text-[11px] font-mono text-gray-300 truncate">
            Blast Furnace Area — Camera 04
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#E1261C] shrink-0 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E1261C] animate-pulse" /> LIVE
          </span>
        </div>

        {/* Stream scene */}
        <div className="relative h-[230px] sm:h-[260px] bg-gradient-to-br from-[#1a2638] via-[#0c1424] to-[#06090f] overflow-hidden select-none">
          {/* Faux scan lines */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)",
            }}
          />

          {/* Simulated Workers */}
          <Worker x="18%" y="36%" />
          <Worker x="52%" y="42%" />
          <Worker x="74%" y="40%" noHat />

          {/* Bounding boxes */}
          <BBox x="12%" y="30%" w="24%" h="55%" color="#16A34A" label="Worker · Compliant" conf="94%" />
          <BBox x="46%" y="38%" w="22%" h="52%" color="#16A34A" label="Worker · Compliant" conf="89%" />
          <BBox x="68%" y="34%" w="22%" h="56%" color="#E1261C" label="⚠ No Helmet" conf="91%" />

          {/* Floating alert inside stream viewport for mobile safety */}
          <div className="absolute top-2.5 right-2.5 bg-white text-[#111827] rounded-md p-2 sm:p-2.5 shadow-lg border-l-4 border-[#E1261C] max-w-[180px] sm:max-w-[210px] z-10">
            <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-mono text-[#E1261C] font-bold">
              <AlertTriangle size={11} className="shrink-0" /> NO HELMET DETECTED
            </div>
            <div className="text-[11px] sm:text-[11.5px] font-semibold mt-0.5 truncate">Zone B · Line 3</div>
            <div className="text-[9px] sm:text-[9.5px] text-gray-500 font-mono">09:18:42 IST</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Worker({ x, y, noHat }: { x: string; y: string; noHat?: boolean }) {
  return (
    <div className="absolute pointer-events-none select-none" style={{ left: x, top: y }}>
      {!noHat && <div className="w-2.5 h-1.5 bg-[#F59E0B] rounded-t mx-auto -mb-px" />}
      <div className="w-2.5 h-2.5 rounded-full bg-black/80 mx-auto" />
      <div className="w-5 h-10 bg-[#E1261C]/70 rounded-sm mt-0.5 mx-auto" />
    </div>
  );
}

function BBox({ x, y, w, h, color, label, conf }: any) {
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        border: `2px solid ${color}`,
        boxShadow: `0 0 10px ${color}55`,
      }}
    >
      <div
        className="absolute -top-4 sm:-top-5 left-0 px-1 sm:px-1.5 py-0.5 rounded-xs text-[8px] sm:text-[9px] font-mono text-white font-semibold whitespace-nowrap shadow-sm"
        style={{ background: color }}
      >
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
    <section id="features" className="bg-white text-[#0F172A] py-14 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold uppercase">POWERFUL FEATURES</div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[34px] md:text-[38px] mt-2 tracking-tight text-[#0A0E1A]">
            Everything you need for a safer workplace
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-10 sm:mt-12">
          {items.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.t}
                className="bg-white border border-gray-200/80 rounded-xl p-5 hover:shadow-lg hover:border-[#E1261C]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                    <Icon size={20} className="text-[#E1261C]" />
                  </div>
                  <h3 className="font-display font-bold text-[15px] text-gray-900 mt-4 leading-snug">{f.t}</h3>
                  <p className="text-[12.5px] text-gray-600 mt-2 leading-[1.55]">{f.d}</p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 mt-4 text-[12px] text-[#E1261C] font-semibold hover:underline"
                >
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
    { icon: Camera, color: "#0891B2", n: "01", t: "CCTV Feed", d: "Live RTSP camera streams ingested into the secure edge AI pipeline." },
    { icon: Cpu, color: "#2563EB", n: "02", t: "AI Processing", d: "YOLOv8 Safety neural network analyzes frames at sub-200ms latency." },
    { icon: AlertTriangle, color: "#D97706", n: "03", t: "Violation Detected", d: "Deterministic rule engine flags PPE breaches and hazard zones." },
    { icon: CheckCircle, color: "#16A34A", n: "04", t: "Alert & Action", d: "Instant broadcast dispatched to duty officers with incident audit logs." },
  ];

  return (
    <section id="solutions" className="bg-[#0F1520] text-white py-14 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center" id="technology">
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold uppercase">HOW IT WORKS</div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[34px] md:text-[38px] mt-2 tracking-tight">
            From Camera to Compliance
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-10 sm:mt-12 relative">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.t}
                className="relative bg-[#1C2333] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div className="absolute right-4 top-3 font-display font-black text-[46px] leading-none opacity-15 select-none" style={{ color: s.color }}>
                  {s.n}
                </div>
                <div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${s.color}25` }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <h3 className="font-display font-bold text-[15px] mt-4 text-white">{s.t}</h3>
                  <p className="text-[12.5px] text-gray-400 mt-2 leading-[1.55]">{s.d}</p>
                </div>
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
    { icon: Heart, t: "Zero Harm", d: "Protecting every life, every single day." },
    { icon: Award, t: "Operational Excellence", d: "Driving industrial safety through cutting-edge AI." },
    { icon: Leaf, t: "Sustainable Future", d: "Responsible manufacturing for tomorrow's generation." },
    { icon: Users, t: "People First", d: "Our shopfloor employees are our greatest asset." },
  ];

  return (
    <section id="about" className="bg-white text-[#0F172A] py-14 sm:py-16 px-4 sm:px-6">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 sm:gap-14 items-center">
        <div>
          <svg width="120" height="36" viewBox="0 0 120 36">
            <path d="M5 28 Q30 8 60 18 Q90 28 115 12" stroke="#E1261C" strokeWidth="3" fill="none" />
            <path d="M105 12 L115 12 L113 22 Z" fill="#E1261C" />
          </svg>
          <div className="font-display font-bold text-[18px] text-[#E1261C] mt-3">
            ArcelorMittal Nippon Steel India
          </div>
          <h2 className="font-display font-extrabold text-[24px] sm:text-[30px] mt-2 text-[#0A0E1A] leading-tight">
            Built on Strength.<br />Driven by Responsibility.
          </h2>
          <div className="w-12 h-1 bg-[#E1261C] rounded-full mt-3" />
          <p className="text-[13px] sm:text-[14px] text-gray-600 mt-4 leading-relaxed max-w-xl">
            SafeVision AI is an AMNS initiative deployed across plants like Talegaon and Hazira, empowering operations with real-time video analytics to ensure zero harm and world-class industrial safety governance.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mt-5 text-[13px] text-[#E1261C] font-semibold hover:underline"
          >
            Explore Platform Solutions <ArrowRight size={13} />
          </Link>
        </div>

        {/* Commitment Cards */}
        <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-5 sm:p-6">
          <div className="text-[11px] tracking-[0.2em] text-[#E1261C] font-semibold uppercase mb-4">OUR COMMITMENT</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {commit.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.t} className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                    <Icon size={16} className="text-[#E1261C]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[13.5px] text-gray-900 leading-snug">{c.t}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5 leading-snug">{c.d}</div>
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

  const isLoggedIn = () => typeof window !== "undefined" && !!localStorage.getItem("token");

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
    <footer id="contact" className="bg-[#0A0E1A] border-t border-white/[0.08] py-10 sm:py-14 px-4 sm:px-6">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <SafeVisionLogo />
          <p className="text-[12px] text-gray-400 mt-3 leading-[1.6]">
            Intelligent Safety. Stronger Tomorrow.<br />
            Smart Vision. Safer Workplaces.
          </p>
          <p className="text-[11px] text-gray-500 mt-3">© 2026 ArcelorMittal Nippon Steel India. All rights reserved.</p>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3 uppercase">PLATFORM</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.path}>
                <button onClick={() => goToApp(l.path)} className="hover:text-white text-left transition-colors cursor-pointer">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3 uppercase">COMPANY</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            <li>
              <a href="https://www.amns.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                AM/NS India
              </a>
            </li>
            <li>
              <a href="#about" className="hover:text-white transition-colors">
                Safety & HSE
              </a>
            </li>
            <li>
              <a href="mailto:support@amns.in" className="hover:text-white transition-colors">
                Contact Support
              </a>
            </li>
            <li>
              <button onClick={() => toast("Privacy policy — updated for ISO 45001 compliance")} className="hover:text-white transition-colors cursor-pointer">
                Privacy Policy
              </button>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-wider text-white mb-3 uppercase">SUPPORT</div>
          <ul className="space-y-2 text-[13px] text-gray-400">
            <li>
              <button onClick={() => toast("SafeVision AI Documentation available in portal")} className="hover:text-white transition-colors cursor-pointer">
                Documentation
              </button>
            </li>
            <li>
              <button onClick={() => toast("API Reference — REST & WebSocket v1.0")} className="hover:text-white transition-colors cursor-pointer">
                API Reference
              </button>
            </li>
            <li>
              <button onClick={() => toast("Help Center available for plant managers")} className="hover:text-white transition-colors cursor-pointer">
                Help Center
              </button>
            </li>
            <li>
              <a href="mailto:it-support@amns.in" className="hover:text-white transition-colors">
                Contact IT Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto mt-8 pt-6 border-t border-white/[0.05] text-[11px] text-gray-500 text-center">
        Powered by innovation. Driven by responsibility. Committed to our people. — AMNS India
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
      toast.success("Demo request submitted. The AMNS HSE team will contact you within 24 hours.");
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1C2333] border border-[#2D3A52] rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div>
            <h3 className="font-display font-bold text-[18px] text-white">Request a Demo</h3>
            <p className="text-[11.5px] text-gray-400 mt-0.5">Experience live computer vision safety intelligence</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <DarkInput label="Full Name" required placeholder="Safety Manager / Officer" />
          <DarkInput label="Work Email" type="email" required placeholder="name@amns.in" />
          <DarkInput label="Facility / Plant" defaultValue="AM/NS India — Talegaon" />
          <div>
            <label className="block text-[11.5px] text-gray-300 font-medium mb-1">Message / Requirements</label>
            <textarea
              rows={3}
              placeholder="e.g. Blast furnace helmet & vest monitoring with CCTV feed integration"
              className="w-full bg-[#0F1623] border border-[#2D3A52] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600 transition-colors"
            />
          </div>
        </div>

        <button
          disabled={loading}
          className="mt-5 w-full h-11 bg-[#E1261C] hover:bg-[#c61f17] text-white font-semibold text-[13px] rounded-md disabled:opacity-60 transition-all cursor-pointer shadow-md"
        >
          {loading ? "Submitting..." : "Submit Demo Request"}
        </button>
      </form>
    </div>
  );
}

export function DarkInput({ label, ...rest }: any) {
  return (
    <div>
      <label className="block text-[11.5px] text-gray-300 font-medium mb-1">{label}</label>
      <input
        {...rest}
        className="w-full h-10 bg-[#0F1623] border border-[#2D3A52] rounded-md px-3 text-[13px] text-white outline-none focus:border-[#E1261C] placeholder:text-gray-600 transition-colors"
      />
    </div>
  );
}
