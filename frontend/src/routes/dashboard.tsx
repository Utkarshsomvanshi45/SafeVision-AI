import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, RefreshCw, Sparkles, X, MessageSquare } from "lucide-react";
import { Donut, PageHeader, SeverityBadge, Skeleton, Sparkline, useMounted } from "@/components/ui-kit";
import { useSentinelStore } from "@/lib/store";
import { dashboardAPI, violationsAPI } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SafeVision AI by AMNS" }] }),
  component: Dashboard,
});

const W = { bg: "#ffffff", border: "1px solid #e5e7eb", radius: "6px", shadow: "0 1px 3px rgba(0,0,0,0.06)" };
const box = { background: W.bg, border: W.border, borderRadius: W.radius, boxShadow: W.shadow } as React.CSSProperties;

const INSIGHT_CARDS = [
  { accent: "#D97706", icon: "⚠", title: "Incident Rate Elevated Today", body: "Total violations 23% above 7-day average. Primary driver: Scrap Yard (8 violations vs avg 3). Shift B overcrowding detected at 14:00–14:30 with 14 workers vs usual 7." },
  { accent: "#E1261C", icon: "📉", title: "Jacket Compliance Declining", body: "Safety Jacket compliance dropped from 91.2% to 86.7% over 7 days. Highest violation rate in Ironmaking department. Pattern correlates with new contractor batch started Monday." },
  { accent: "#2563EB", icon: "📷", title: "Coverage Gap Detected", body: "Coke Oven Bank A offline for 2h 14m. Weight Bridge has 9-minute detection gap at 08:32. 3 potential unmonitored violations estimated during downtime." },
  { accent: "#16A34A", icon: "✅", title: "Shift A Performing Well", body: "Current shift (A) on track for best compliance this week. Helmet compliance at 93.1% — above 90% target. HR Slitting: 0 violations in last 3 hours." },
];

function Dashboard() {
  const navigate    = useNavigate();
  const mounted     = useMounted();
  const { alerts, aiFramesPerMin, lastDetectionSec, framesAnalyzed } = useSentinelStore();

  const [time, setTime]         = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'today' | '7days' | '30days'>('today');
  const [periodData, setPeriodData] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // ── Token guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate({ to: '/login' });
  }, [navigate]);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const data = await dashboardAPI.getOverview();
      setOverview(data);
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWs = useCallback((msg: any) => {
    if (msg.type === 'violation_alert' || msg.type === 'new_violation') {
      fetchData();
    }
  }, [fetchData]);

  useWebSocket(handleWs);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch period data when tab changes
  useEffect(() => {
    if (chartPeriod === 'today') {
      setPeriodData([]); // use timelineData from overview
      return;
    }
    const days = chartPeriod === '7days' ? 7 : 30;
    violationsAPI.getAll({ limit: days * 50 })
      .then((data: any) => {
        const violations = Array.isArray(data) ? data : (data.violations ?? data.items ?? []);
        // Group by day
        const dayMap: Record<string, { helmet: number; jacket: number }> = {};
        violations.forEach((v: any) => {
          const d = v.detected_at ? new Date(v.detected_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
          if (!dayMap[d]) dayMap[d] = { helmet: 0, jacket: 0 };
          if (v.violation_type?.toLowerCase().includes('helmet')) dayMap[d].helmet++;
          else dayMap[d].jacket++;
        });
        setPeriodData(Object.entries(dayMap).map(([hour, vals]) => ({ hour, ...vals })));
      })
      .catch(() => setPeriodData([]));
  }, [chartPeriod]);

  useEffect(() => {
    const i = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    setTime(new Date().toLocaleTimeString());
    return () => clearInterval(i);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const kpis             = overview?.kpis;
  const recentViolations = overview?.recent_violations ?? [];
  const apiCameras       = overview?.cameras ?? [];

  const todayViolations = kpis?.total_violations_today ?? 0;
  const complianceRate  = kpis?.compliance_rate ?? 0;
  const openAlerts      = kpis?.active_alerts ?? 0;
  const camerasOnline   = kpis?.cameras_online ?? 0;
  const camerasTotal    = kpis?.cameras_total ?? 0;
  const aiFrames        = framesAnalyzed;

  // Build hourly chart data from real violations
  const timelineData = Array.from({ length: 24 }, (_, h) => {
    const helmet = recentViolations.filter((v: any) => {
      const d = v.detected_at ? new Date(v.detected_at) : null;
      return d && d.getHours() === h && v.violation_type?.toLowerCase().includes('helmet');
    }).length;
    const jacket = recentViolations.filter((v: any) => {
      const d = v.detected_at ? new Date(v.detected_at) : null;
      return d && d.getHours() === h && v.violation_type?.toLowerCase().includes('jacket');
    }).length;
    return { hour: String(h).padStart(2, "0"), helmet, jacket };
  });

  // Violation type breakdown
  const byTypeMap: Record<string, number> = {};
  recentViolations.forEach((v: any) => {
    const t = v.violation_type ?? 'Unknown';
    byTypeMap[t] = (byTypeMap[t] ?? 0) + 1;
  });
  const byType = Object.entries(byTypeMap).map(([type, count], i) => ({
    type: type.replace('Helmet Not Worn', 'Helmet').replace('Safety Jacket Missing', 'Jacket'),
    count,
    color: ["#E1261C","#EA580C","#D97706","#7C3AED","#2563EB","#0891B2","#059669"][i % 7],
  }));
  const totalByType = byType.reduce((s, x) => s + x.count, 0) || 1;

  const cameraList    = apiCameras;
  const onlineCount   = cameraList.filter((c: any) => c.status === 'online').length;
  const offlineCount  = cameraList.filter((c: any) => c.status === 'offline').length;
  const degradedCount = cameraList.filter((c: any) => c.status === 'degraded').length;

  return (
    <div>
      <PageHeader
        title="Plant Safety Overview"
        right={
          <>
            <span className="font-mono text-[14px]" style={{ color: "#6b7280" }}>{time}</span>
            <button onClick={fetchData} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <Download size={14} /> Export Report
            </button>
            <button onClick={() => { setLoading(true); fetchData(); }} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      {/* Live Ops bar */}
      <div style={{ background: "#1c2333", borderBottom: "1px solid #2d3a52", color: "#f9fafb", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "inline-block" }} className="animate-pulse" />
          <span style={{ fontSize: 12, fontWeight: 500 }}>SYSTEM ACTIVE</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>· All AI models running</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }} className="hidden md:block">
          <div className="ticker" style={{ whiteSpace: "nowrap", fontSize: 12, display: "flex", gap: 32 }}>
            {recentViolations.length === 0 ? (
              <span style={{ color: "#6b7280" }}>No violations detected — plant is safe ✅</span>
            ) : recentViolations.slice(0, 6).map((v: any, i: number) => (
              <span key={i} style={{ color: "#FCA5A5" }}>
                ⚠ {v.detected_at ? new Date(v.detected_at).toLocaleTimeString() : ''} — {v.violation_type} — {v.camera_name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, fontFamily: "IBM Plex Mono", fontSize: 11, color: "#9ca3af" }}>
          <span>AI: <span style={{ color: "#f9fafb" }}>{aiFramesPerMin} frames/min</span></span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span>Last Detection: <span style={{ color: "#f9fafb" }}>{lastDetectionSec}s</span> ago</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "10px 24px", fontSize: 13 }}>
          ⚠ Failed to load dashboard data.{" "}
          <button onClick={fetchData} style={{ fontWeight: 600, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#991B1B" }}>
            Retry
          </button>
        </div>
      )}

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <KpiCard accent="#E1261C" label="TOTAL VIOLATIONS TODAY" value={loading ? "—" : todayViolations} mounted={mounted}
            extra={<><Sparkline data={[3,5,2,7,4,8,6,9,3,5]} /><div style={{ fontSize: 11, color: "#E1261C", marginTop: 4 }}>Today</div></>} />
          <KpiCard accent="#16A34A" label="SAFETY COMPLIANCE RATE" value={loading ? "—" : `${complianceRate}%`} mounted={mounted}
            extra={<><Donut value={complianceRate} size={48} stroke={5} color="#16A34A" showLabel={false} /></>} row />
          <KpiCard accent="#D97706" label="ACTIVE ALERTS" value={loading ? "—" : openAlerts} mounted={mounted}
            extra={<div style={{ fontSize: 11, color: "#6b7280" }}>Open alerts</div>} />
          <KpiCard accent="#2563EB" label="CAMERAS ONLINE" value={loading ? "—" : `${camerasOnline}/${camerasTotal}`} mounted={mounted}
            extra={
              <>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {Array.from({ length: camerasOnline }).map((_,i) => <div key={i} style={{ width: 8, height: 8, background: "#16A34A" }} />)}
                  {Array.from({ length: degradedCount }).map((_,i) => <div key={i} style={{ width: 8, height: 8, background: "#D97706" }} />)}
                  {Array.from({ length: offlineCount }).map((_,i) => <div key={i} style={{ width: 8, height: 8, background: "#6B7280" }} />)}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{offlineCount + degradedCount > 0 ? `${offlineCount + degradedCount} need attention` : 'All healthy'}</div>
              </>
            } />
          <KpiCard accent="#7C3AED" label="CURRENT SHIFT VIOLATIONS" value={loading ? "—" : todayViolations} mounted={mounted}
            extra={<div style={{ fontSize: 11, color: "#6b7280" }}>Today's total</div>} />
          <KpiCard accent="#0891B2" label="AI FRAMES ANALYZED" value={aiFrames.toLocaleString()} mounted={mounted}
            extra={<div style={{ fontSize: 11, color: "#6b7280" }}>{aiFramesPerMin}/min · 42ms latency</div>} />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
          <div style={{ background: "#1c2333", border: "1px solid #2d3a52", borderRadius: 6, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "#f9fafb", fontFamily: "DM Sans" }}>Violation Frequency</h2>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Plant-wide hourly trend</p>
              </div>
              <div style={{ display: "flex", background: "#243044", borderRadius: 4, padding: 2 }}>
                {([['Today','today'],['7 Days','7days'],['30 Days','30days']] as const).map(([label, key]) => (
                  <button key={key} onClick={() => setChartPeriod(key)}
                    style={{ padding: "4px 10px", borderRadius: 3, fontSize: 11, border: "none", cursor: "pointer",
                      background: chartPeriod === key ? "#2d3a52" : "transparent",
                      color: chartPeriod === key ? "#f9fafb" : "#9ca3af" }}>{label}</button>
                ))}
              </div>
            </div>
            {!mounted ? <Skeleton className="h-[240px]" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartPeriod === 'today' ? timelineData : periodData}>
                  <defs>
                    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E1261C" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#E1261C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="j" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97706" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2D3A52" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                  <Area type="monotone" dataKey="helmet" stroke="#E1261C" fill="url(#h)" strokeWidth={2} />
                  <Area type="monotone" dataKey="jacket" stroke="#D97706" fill="url(#j)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={box}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: "DM Sans", marginBottom: 4 }}>By Violation Type</h2>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>Last 24 hours</p>
            {!mounted ? <Skeleton className="h-[240px]" /> : byType.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, paddingTop: 40 }}>No violations today ✅</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {byType.map((b) => (
                  <div key={b.type} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <div style={{ width: 80, color: "#6b7280" }}>{b.type}</div>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 2, height: 20, position: "relative", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(b.count / Math.max(...byType.map(x=>x.count))) * 100}%`, background: b.color, borderRadius: 2 }} />
                    </div>
                    <div style={{ width: 24, textAlign: "right", fontFamily: "IBM Plex Mono", color: "#374151" }}>{b.count}</div>
                    <div style={{ width: 32, textAlign: "right", fontSize: 10, color: "#9ca3af" }}>{Math.round((b.count / totalByType) * 100)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3-col operational */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

          {/* Camera Health */}
          <div style={{ ...box, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "DM Sans" }}>Camera Health</h2>
            </div>
            <div>
              {loading ? (
                <div style={{ padding: 20 }}><Skeleton className="h-[200px]" /></div>
              ) : cameraList.length === 0 ? (
                <div style={{ padding: 20, color: "#9ca3af", fontSize: 12, textAlign: "center" }}>No cameras configured</div>
              ) : cameraList.map((c: any) => (
                <div key={c.camera_id} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: c.status === "online" ? "#16A34A" : c.status === "degraded" ? "#D97706" : "#6B7280" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{c.location}</div>
                  </div>
                  <span style={{ fontFamily: "IBM Plex Mono", fontSize: 9.5, color: "#9ca3af" }}>
                    {c.status === "online" ? "LIVE" : c.status === "offline" ? "OFFLINE" : "DEGRADED"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 11, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
              <span>{onlineCount} online · {offlineCount} offline · {degradedCount} degraded</span>
              <a href="/live" style={{ color: "#E1261C", fontWeight: 500, textDecoration: "none" }}>View →</a>
            </div>
          </div>

          {/* Live Events */}
          <div style={{ ...box, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E1261C" }} className="animate-pulse" />
              <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#E1261C", fontWeight: 600 }}>LIVE EVENTS</span>
              <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }}>Real-time</span>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 20 }}><Skeleton className="h-[200px]" /></div>
              ) : recentViolations.length === 0 ? (
                <div style={{ padding: 20, color: "#9ca3af", fontSize: 12, textAlign: "center" }}>No violations today ✅</div>
              ) : recentViolations.slice(0, 12).map((v: any, i: number) => (
                <div key={v.id ?? i} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: v.severity === "critical" ? "#E1261C" : v.severity === "high" ? "#EA580C" : "#D97706" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.violation_type}</div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{v.camera_name}</div>
                  </div>
                  <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#9ca3af" }}>
                    {v.detected_at ? new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shift Performance */}
          <div style={{ ...box, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "DM Sans" }}>Shift Performance</h2>
            </div>
            {(() => {
              const saved = typeof window !== 'undefined' ? localStorage.getItem('sv_shifts') : null;
              const shifts = saved ? JSON.parse(saved) : [
                { label: 'Shift A', start: '06:00', end: '14:00' },
                { label: 'Shift B', start: '14:00', end: '22:00' },
                { label: 'Shift C', start: '22:00', end: '06:00' },
                { label: 'Shift D', start: '00:00', end: '06:00' },
              ];
              const h = new Date().getHours() + new Date().getMinutes() / 60;
              const toH = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh + mm / 60; };
              return shifts.map((s: any) => {
                const st = toH(s.start); const en = toH(s.end);
                const current = en > st ? h >= st && h < en : h >= st || h < en;
                return { sh: s.label.replace('Shift ', ''), time: `${s.start}–${s.end}`, current };
              });
            })().map((r: any) => (
              <div key={r.sh} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f9fafb", borderLeft: r.current ? "3px solid #E1261C" : "3px solid transparent", background: r.current ? "#fff5f5" : "#fff" }}>
                <div style={{ width: 28, height: 28, borderRadius: 4, background: "#1f2937", color: "#fff", fontSize: 12, fontFamily: "IBM Plex Mono", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.sh}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1f2937" }}>
                    Shift {r.sh}{r.current && <span style={{ marginLeft: 6, fontSize: 9, color: "#E1261C", fontFamily: "IBM Plex Mono" }}>CURRENT</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "IBM Plex Mono" }}>{r.time}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "DM Sans" }}>{r.current ? todayViolations : 0}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>violations</div>
                </div>
                <Donut value={complianceRate || 100} size={36} stroke={4} color={complianceRate >= 90 ? "#16A34A" : complianceRate >= 85 ? "#D97706" : "#E1261C"} showLabel={false} />
              </div>
            ))}
            <div style={{ padding: "10px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 11, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
              <span>Compliance: <span style={{ fontWeight: 500, color: "#374151" }}>{complianceRate}%</span></span>
              <span>Violations: <span style={{ fontWeight: 500, color: "#E1261C" }}>{todayViolations}</span></span>
            </div>
          </div>
        </div>

        {/* AI Intelligence */}
        <AIInsightsPanel />

        {/* Recent Incidents */}
        <div style={{ ...box, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "DM Sans" }}>Recent Incidents</h2>
            <a href="/alerts" style={{ fontSize: 12, color: "#E1261C", fontWeight: 500, textDecoration: "none" }}>View all →</a>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["#", "Timestamp", "Camera", "Zone", "Type", "Severity", "Confidence", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 24 }}><Skeleton className="h-[120px]" /></td></tr>
                ) : recentViolations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                      No violations yet — system is monitoring ✅
                    </td>
                  </tr>
                ) : recentViolations.slice(0, 10).map((v: any, i: number) => (
                  <tr key={v.id ?? i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono", color: "#374151" }}>
                      {v.detected_at ? new Date(v.detected_at).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#1f2937" }}>{v.camera_name}</td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{v.zone ?? '—'}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1f2937" }}>{v.violation_type}</td>
                    <td style={{ padding: "10px 12px" }}><SeverityBadge severity={v.severity} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "IBM Plex Mono", color: "#374151" }}>{v.confidence ? `${Math.round(v.confidence * 100)}%` : '—'}</span>
                        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(v.confidence ?? 0) * 100}%`, background: "#E1261C" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button style={{ color: "#E1261C", fontSize: 11, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ accent, label, value, extra, mounted, row }: { accent: string; label: string; value: React.ReactNode; extra?: React.ReactNode; mounted: boolean; row?: boolean }) {
  if (!mounted) return <div style={{ ...box, padding: 20, height: 110 }}><Skeleton className="h-full" /></div>;
  return (
    <div style={{ ...box, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "6px 6px 0 0" }} />
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{label}</div>
      <div style={{ display: "flex", alignItems: row ? "center" : "flex-start", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
        <div style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: "#111827" }}>{value}</div>
        {row && extra}
      </div>
      {!row && extra && <div style={{ marginTop: 4 }}>{extra}</div>}
    </div>
  );
}

// ── AI Insights Panel ──────────────────────────────────────────────────────────
function AIInsightsPanel() {
  const [askOpen, setAskOpen] = React.useState(false);
  const [q, setQ]             = React.useState("");
  const [answer, setAnswer]   = React.useState<string | null>(null);

  return (
    <div style={{ background: "#1c2333", border: "1px solid #2d3a52", borderRadius: 6, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} color="#E1261C" />
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#f9fafb", fontFamily: "DM Sans" }}>AI Operational Intelligence</h2>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "IBM Plex Mono", color: "#10B981", marginLeft: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} className="animate-pulse" /> LIVE ANALYSIS
          </span>
        </div>
        <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "#9ca3af" }}>Generated · SafeVision AI v3</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {INSIGHT_CARDS.map((c) => (
          <div key={c.title} style={{ background: "#243044", borderRadius: 4, padding: "14px 16px 14px 20px", position: "relative", borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f9fafb", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{c.icon}</span>{c.title}
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, lineHeight: 1.6 }}>{c.body}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, color: "#9ca3af" }}>4 insights · live</span>
        <button onClick={() => setAskOpen(true)} style={{ fontSize: 12, color: "#E1261C", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <MessageSquare size={12} /> Ask AI →
        </button>
      </div>
      {askOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setAskOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 500, padding: 20, color: "#111827" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={14} color="#E1261C" /> AI Copilot
              </h3>
              <button onClick={() => setAskOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={16} /></button>
            </div>
            <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Ask about today's plant safety…"
              style={{ width: "100%", padding: 10, fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, color: "#1f2937", outline: "none", resize: "none", boxSizing: "border-box" }} />
            <button onClick={() => setAnswer("Based on today's data: The system is monitoring all cameras. Run the pipeline to start detecting violations.")}
              style={{ marginTop: 8, padding: "0 12px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Ask AI</button>
            {answer && <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 4, fontSize: 12.5, lineHeight: 1.6, border: "1px solid #e5e7eb", color: "#374151" }}>{answer}</div>}
          </div>
        </div>
      )}
    </div>
  );
}