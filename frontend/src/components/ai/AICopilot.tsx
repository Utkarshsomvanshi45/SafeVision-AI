import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, X, Send, Cpu, RefreshCw } from "lucide-react";
import { useSentinelStore } from "@/lib/store";
import { dashboardAPI, alertsAPI, camerasAPI, violationsAPI } from "@/lib/api";

interface Msg { role: "user" | "ai"; text: string; }

const SUGGESTIONS = [
  "How many violations today?",
  "Which camera is offline?",
  "What's the current shift?",
  "Most common violation type?",
  "How many alerts are open?",
  "Which zone has most violations?",
];

// ── Context builder — fetches real data ──────────────────────────────────────
async function buildContext() {
  try {
    const [overview, alertStats, cameras] = await Promise.allSettled([
      dashboardAPI.getOverview(),
      alertsAPI.getStats(),
      camerasAPI.getAll(),
    ]);

    const ov = overview.status === "fulfilled" ? overview.value : null;
    const as = alertStats.status === "fulfilled" ? alertStats.value : null;
    const cams = cameras.status === "fulfilled"
      ? (Array.isArray(cameras.value) ? cameras.value : cameras.value?.cameras ?? [])
      : [];

    const kpis = ov?.kpis ?? {};
    const violations = ov?.recent_violations ?? [];

    // Camera stats
    const onlineCams = cams.filter((c: any) => c.status === "online");
    const offlineCams = cams.filter((c: any) => c.status === "offline");
    const degradedCams = cams.filter((c: any) => c.status === "degraded");

    // Violation breakdown
    const typeMap: Record<string, number> = {};
    violations.forEach((v: any) => {
      const t = v.violation_type ?? "Unknown";
      typeMap[t] = (typeMap[t] ?? 0) + 1;
    });
    const topViolation = Object.entries(typeMap).sort((a, b) => b[1] - a[1])[0];

    // Zone breakdown
    const zoneMap: Record<string, number> = {};
    violations.forEach((v: any) => {
      const z = v.zone ?? "Unknown";
      zoneMap[z] = (zoneMap[z] ?? 0) + 1;
    });
    const topZone = Object.entries(zoneMap).sort((a, b) => b[1] - a[1])[0];

    // Shift info from localStorage
    const savedShifts = typeof window !== "undefined" ? localStorage.getItem("sv_shifts") : null;
    const shifts = savedShifts ? JSON.parse(savedShifts) : [
      { label: "Shift A", start: "06:00", end: "14:00" },
      { label: "Shift B", start: "14:00", end: "22:00" },
      { label: "Shift C", start: "22:00", end: "06:00" },
      { label: "Shift D", start: "00:00", end: "06:00" },
    ];
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const toH = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh + mm / 60; };
    const currentShift = shifts.find((s: any) => {
      const st = toH(s.start); const en = toH(s.end);
      return en > st ? h >= st && h < en : h >= st || h < en;
    }) ?? shifts[0];

    return {
      totalViolationsToday: kpis.total_violations_today ?? 0,
      complianceRate: kpis.compliance_rate ?? 0,
      activeAlerts: kpis.active_alerts ?? as?.open ?? 0,
      camerasOnline: onlineCams.length,
      camerasTotal: cams.length,
      camerasOffline: offlineCams.map((c: any) => c.name ?? c.camera_id),
      camerasDegraded: degradedCams.map((c: any) => c.name ?? c.camera_id),
      allCameras: cams.map((c: any) => ({ name: c.name, status: c.status, zone: c.zone })),
      totalAlerts: as?.total ?? 0,
      resolvedAlerts: as?.resolved ?? 0,
      criticalAlerts: as?.critical ?? 0,
      topViolationType: topViolation ? `${topViolation[0]} (${topViolation[1]} times)` : "None",
      topZone: topZone ? `${topZone[0]} (${topZone[1]} violations)` : "None",
      violationBreakdown: Object.entries(typeMap).map(([k, v]) => `${k}: ${v}`).join(", ") || "None",
      zoneBreakdown: Object.entries(zoneMap).map(([k, v]) => `${k}: ${v}`).join(", ") || "None",
      recentViolations: violations.slice(0, 5).map((v: any) =>
        `${v.violation_type} at ${v.camera_name} (${v.confidence?.toFixed(0)}% conf)`
      ).join("; ") || "None",
      currentShift: `${currentShift.label} (${currentShift.start}–${currentShift.end})`,
      plantName: typeof window !== "undefined" ? (localStorage.getItem("sv_plant_name") ?? "Talegaon Plant") : "Talegaon Plant",
      currentTime: new Date().toLocaleTimeString("en-IN", { hour12: false }),
    };
  } catch {
    return null;
  }
}

// ── Smart response generator using real context ───────────────────────────────
function generateSmartResponse(q: string, ctx: any): string {
  if (!ctx) return "I'm having trouble connecting to the plant data right now. Please try again in a moment.";

  const lq = q.toLowerCase();

  // Violation count questions
  if (/(how many|count|number|total).*violation/.test(lq) || /violation.*(count|today|number|how many)/.test(lq)) {
    if (ctx.totalViolationsToday === 0) return `No violations detected today at ${ctx.plantName}. Plant is operating safely. ✅`;
    return `**${ctx.totalViolationsToday} violations** detected today at ${ctx.plantName}.\n\nBreakdown by type: ${ctx.violationBreakdown}.\n\nMost common: ${ctx.topViolationType}.\nMost affected zone: ${ctx.topZone}.`;
  }

  // Yesterday / historical
  if (/yesterday|last (day|24|shift)|previous/.test(lq)) {
    return `I have access to today's live data. For historical reports, please check the Reports section where daily safety reports are available for download.`;
  }

  // Alert questions
  if (/(alert|open alert|critical|unresolved)/.test(lq)) {
    if (ctx.activeAlerts === 0) return `No active alerts right now. All ${ctx.resolvedAlerts} previous alerts have been resolved. ✅`;
    return `**${ctx.activeAlerts} active alerts** currently open.\n\nCritical: ${ctx.criticalAlerts}\nTotal today: ${ctx.totalAlerts}\nResolved: ${ctx.resolvedAlerts}\n\nVisit Alert Center to review and assign them.`;
  }

  // Camera questions
  if (/(camera|feed|offline|online|coverage|degraded)/.test(lq)) {
    const offline = ctx.camerasOffline.length > 0 ? `\n\n⚠ Offline: ${ctx.camerasOffline.join(", ")}` : "";
    const degraded = ctx.camerasDegraded.length > 0 ? `\n⚠ Degraded: ${ctx.camerasDegraded.join(", ")}` : "";
    return `**${ctx.camerasOnline} of ${ctx.camerasTotal} cameras** are currently online.${offline}${degraded}\n\n${ctx.camerasOnline === ctx.camerasTotal ? "All cameras operational ✅" : "Recommend IT inspection of offline cameras."}`;
  }

  // Compliance / PPE
  if (/(compliance|ppe|helmet|jacket|gloves|safety gear)/.test(lq)) {
    const rate = ctx.complianceRate;
    const grade = rate >= 90 ? "Excellent 🟢" : rate >= 80 ? "Good 🟡" : "Needs attention 🔴";
    return `**PPE Compliance: ${rate.toFixed(1)}%** — ${grade}\n\nTop violation: ${ctx.topViolationType}\nMost affected zone: ${ctx.topZone}\n\n${rate < 85 ? "Recommend immediate safety briefing for workers in " + (ctx.topZone?.split(" (")[0] ?? "affected zones") + "." : "Keep up the good work!"}`;
  }

  // Zone questions
  if (/(zone|area|location|sector|which zone|zone.*violation|violation.*zone)/.test(lq)) {
    if (!ctx.zoneBreakdown || ctx.zoneBreakdown === "None") return `No zone violations recorded today. All plant areas are operating safely. ✅`;
    return `**Zone violation breakdown today:**\n${ctx.zoneBreakdown.split(", ").map((z: string) => `• ${z}`).join("\n")}\n\nHighest risk zone: **${ctx.topZone}**\n\nVisit Zone Control to review detection rules.`;
  }

  // Shift questions
  if (/(shift|current shift|which shift|shift timing)/.test(lq)) {
    return `**Current shift: ${ctx.currentShift}**\nTime: ${ctx.currentTime}\n\nShift violations today: ${ctx.totalViolationsToday}\nCompliance rate: ${ctx.complianceRate.toFixed(1)}%\n\nVisit Settings → General to update shift timings.`;
  }

  // Risk questions
  if (/(risk|danger|safe|safety score|how safe)/.test(lq)) {
    const risk = ctx.complianceRate < 80 ? "HIGH ⚠" : ctx.complianceRate < 90 ? "MODERATE 🟡" : "LOW 🟢";
    return `**Plant risk level: ${risk}**\n\nCompliance rate: ${ctx.complianceRate.toFixed(1)}%\nActive alerts: ${ctx.activeAlerts}\nViolations today: ${ctx.totalViolationsToday}\n\n${ctx.topZone !== "None" ? "Most at-risk zone: " + ctx.topZone : "No violations recorded today."}`;
  }

  // Recent violations
  if (/(recent|latest|last|just now|what happened)/.test(lq)) {
    if (ctx.recentViolations === "None") return `No violations recorded today. Plant is operating safely. ✅`;
    return `**Recent violations:**\n${ctx.recentViolations.split("; ").map((v: string) => `• ${v}`).join("\n")}`;
  }

  // Count cameras specifically
  if (/(how many camera|camera count|total camera|number of camera)/.test(lq)) {
    return `**${ctx.camerasTotal} total cameras** installed at ${ctx.plantName}.\n\n• Online: ${ctx.camerasOnline}\n• Offline: ${ctx.camerasOffline.length}\n• Degraded: ${ctx.camerasDegraded.length}\n\nCamera coverage: ${ctx.camerasTotal > 0 ? Math.round((ctx.camerasOnline / ctx.camerasTotal) * 100) : 0}%`;
  }

  // General status / overview
  if (/(status|overview|summary|report|how is|what is happening|update)/.test(lq)) {
    return `**${ctx.plantName} — Live Status @ ${ctx.currentTime}**\n\n📊 Violations today: ${ctx.totalViolationsToday}\n✅ Compliance: ${ctx.complianceRate.toFixed(1)}%\n🔔 Active alerts: ${ctx.activeAlerts}\n📷 Cameras: ${ctx.camerasOnline}/${ctx.camerasTotal} online\n⚡ Current shift: ${ctx.currentShift}\n\n${ctx.activeAlerts > 0 ? "⚠ Action needed: " + ctx.activeAlerts + " alert(s) require attention." : "Plant is operating normally. ✅"}`;
  }

  // Hello / greeting
  if (/(hello|hi|hey|good morning|good afternoon|namaste)/.test(lq)) {
    return `Hello! I'm **SafeVision Copilot** for ${ctx.plantName}.\n\nCurrent status: **${ctx.totalViolationsToday} violations** today, **${ctx.activeAlerts} active alerts**, **${ctx.camerasOnline}/${ctx.camerasTotal} cameras** online.\n\nAsk me anything about plant safety, violations, cameras, zones, or shifts!`;
  }

  // Fallback with context
  return `Based on current plant data:\n\n• Violations today: ${ctx.totalViolationsToday}\n• Compliance: ${ctx.complianceRate.toFixed(1)}%\n• Active alerts: ${ctx.activeAlerts}\n• Cameras online: ${ctx.camerasOnline}/${ctx.camerasTotal}\n• Current shift: ${ctx.currentShift}\n\nTry asking about violations, cameras, alerts, zones, compliance, or current shift status!`;
}

// ── Component ────────────────────────────────────────────────────────────────
export function AICopilotPanel() {
  const { copilotOpen, setCopilotOpen } = useSentinelStore();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "I'm **SafeVision Copilot** — connected to live plant data. Ask me anything about violations, cameras, alerts, zones, compliance, or shifts at AM/NS Talegaon!" },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [ctx, setCtx] = useState<any>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load context when panel opens
  useEffect(() => {
    if (!copilotOpen) return;
    setCtxLoading(true);
    buildContext().then((c) => {
      setCtx(c);
      setCtxLoading(false);
    });
  }, [copilotOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const refreshCtx = useCallback(() => {
    setCtxLoading(true);
    buildContext().then((c) => {
      setCtx(c);
      setCtxLoading(false);
    });
  }, []);

  const send = (q: string) => {
    if (!q.trim() || thinking) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    // Refresh context on each message for freshest data
    buildContext().then((freshCtx) => {
      setCtx(freshCtx);
      setTimeout(() => {
        setMessages((m) => [...m, { role: "ai", text: generateSmartResponse(q, freshCtx) }]);
        setThinking(false);
      }, 600 + Math.random() * 400);
    });
  };

  if (!copilotOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => setCopilotOpen(false)} />
      <aside className="relative w-full max-w-[440px] h-full bg-bg-panel border-l border-border-panel flex flex-col pointer-events-auto shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-panel flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-red to-[#7F1D1D] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text-on-dark flex items-center gap-1.5">
              SafeVision Copilot
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]">
                {ctxLoading ? "LOADING..." : "ONLINE"}
              </span>
            </div>
            <div className="text-[10.5px] text-text-on-dark-muted font-mono">
              Live plant data · {ctx ? `${ctx.totalViolationsToday} violations today` : "connecting..."}
            </div>
          </div>
          <button onClick={refreshCtx} title="Refresh data"
            className="text-text-on-dark-muted hover:text-text-on-dark p-1.5 rounded">
            <RefreshCw size={14} className={ctxLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setCopilotOpen(false)}
            className="text-text-on-dark-muted hover:text-text-on-dark p-1.5 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto dark-scroll p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[88%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-red text-white"
                  : "bg-bg-panel-2 text-text-on-dark border border-border-panel"
              }`}>
                {m.text.split("\n").map((line, j) => {
                  const formatted = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                  return <div key={j} className={j > 0 ? "mt-1" : ""} dangerouslySetInnerHTML={{ __html: formatted }} />;
                })}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-[11px] text-text-on-dark-muted">
              <Cpu size={12} className="animate-pulse" />
              <span>Fetching live plant data…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border-panel p-3 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="shrink-0 text-[10.5px] px-2.5 py-1 rounded-full bg-bg-panel-2 border border-border-panel text-text-on-dark-muted hover:text-text-on-dark hover:border-brand-red whitespace-nowrap">
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 bg-bg-panel-2 border border-border-panel rounded px-3 h-10 focus-within:border-brand-red">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about plant safety…"
              className="flex-1 bg-transparent text-[13px] text-text-on-dark placeholder:text-text-on-dark-muted/60 outline-none" />
            <button type="submit" disabled={thinking}
              className="text-brand-red hover:text-white p-1 disabled:opacity-40">
              <Send size={14} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

export function AICopilot() {
  return <AICopilotPanel />;
}