import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui-kit";
import { FileText, Calendar, BarChart3, ShieldCheck, MonitorPlay, Cpu, Download, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — SafeVision AI" }] }),
  component: ReportsPage,
});

const REPORT_TYPES = [
  { key: "daily",   label: "Daily Safety Report",  icon: FileText,   desc: "Today's violations, alerts & camera health" },
  { key: "weekly",  label: "Weekly Compliance",     icon: Calendar,   desc: "7-day trend, daily breakdown & type analysis" },
  { key: "monthly", label: "Monthly Analytics",     icon: BarChart3,  desc: "30-day summary, top zones & violation trends" },
  { key: "audit",   label: "Safety Audit",          icon: ShieldCheck,desc: "Compliance snapshots review & acceptance rate" },
  { key: "camera",  label: "Camera Performance",    icon: MonitorPlay,desc: "Camera uptime, fps, violations per camera" },
  { key: "ai",      label: "AI Model Report",       icon: Cpu,        desc: "Detection modules, confidence stats & accuracy" },
];

interface DownloadItem { name: string; type: string; date: string; size: string; blob?: Blob; }
interface Schedule { id: number; name: string; schedule: string; recipients: string; }

const INITIAL_SCHEDULED: Schedule[] = [
  { id: 1, name: "Daily Safety",      schedule: "07:00 daily", recipients: "Safety Head, Plant Head" },
  { id: 2, name: "Weekly Compliance", schedule: "Mon 08:00",   recipients: "All HSE managers" },
];

const BASE     = "http://localhost:8000";
const authFetch = (url: string) =>
  fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }).then((r) => r.json());

// ── HTML report builder ──────────────────────────────────────────────────────
function buildHTML(title: string, subtitle: string, body: string): Blob {
  const plantName = localStorage.getItem("sv_plant_name") || "Talegaon Plant";
  const now       = new Date();
  const dateStr   = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const timeStr   = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1f2937;font-size:13px;background:#fff}
.page{padding:40px;max-width:820px;margin:auto}
.header{background:#0A0E1A;padding:20px 28px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center}
.brand{color:#E1261C;font-size:20px;font-weight:700}
.badge{background:#E1261C;color:#fff;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:700}
.title-band{background:#E1261C;padding:14px 28px;margin-bottom:20px}
.rt{color:#fff;font-size:18px;font-weight:700}
.rm{color:rgba(255,255,255,.85);font-size:10px;margin-top:2px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.kpi{border:1px solid #e5e7eb;border-radius:5px;padding:12px;text-align:center}
.kv{font-size:24px;font-weight:700}
.kl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-top:3px}
.sec{margin:20px 0}
.sec-title{font-size:13px;font-weight:600;border-bottom:2px solid #E1261C;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f9fafb;text-align:left;padding:7px 9px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;border-bottom:1px solid #e5e7eb}
td{padding:8px 9px;border-bottom:1px solid #f3f4f6}
.alert-box{background:#FEF2F2;border:1px solid #FECACA;border-radius:5px;padding:12px 16px;margin:10px 0;font-size:11px;color:#991B1B;line-height:1.6}
.ok-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:12px 16px;margin:10px 0;font-size:11px;color:#15803D;line-height:1.6}
.footer{background:#0A0E1A;padding:14px 28px;border-radius:0 0 6px 6px;display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:20px}
.bar-wrap{background:#f3f4f6;border-radius:2px;height:10px;flex:1}
.bar-fill{height:10px;border-radius:2px}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:10px}
.tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600}
@media print{body{-webkit-print-color-adjust:exact}}
</style></head>
<body><div class="page">
<div class="header">
  <div>
    <span class="brand">AMNS</span>
    <span style="color:#9CA3AF;font-size:11px;margin-left:8px">ArcelorMittal Nippon Steel India</span>
    <div style="color:#6B7280;font-size:10px;margin-top:3px">SafeVision AI — Safety Monitoring System</div>
  </div>
  <span class="badge">OFFICIAL REPORT</span>
</div>
<div class="title-band">
  <div class="rt">${title}</div>
  <div class="rm">AM/NS India — ${plantName} · ${subtitle} · Generated ${dateStr} at ${timeStr} IST</div>
</div>
${body}
<div class="footer">
  <span>Generated by SafeVision AI · ${title} · ${dateStr}</span>
  <span>AM/NS India — ${plantName} · Confidential</span>
</div>
</div></body></html>`;
  return new Blob([html], { type: "text/html" });
}

// ── CSV builder ──────────────────────────────────────────────────────────────
function buildCSV(title: string, rows: any[][]): Blob {
  const lines = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
  return new Blob([[`"SafeVision AI — ${title}"`, ...lines].join("\n")], { type: "text/csv" });
}

// ── 1. DAILY SAFETY REPORT ───────────────────────────────────────────────────
async function generateDaily(fmt: string): Promise<Blob> {
  const [dash, alertStats] = await Promise.all([
    authFetch("/api/dashboard/overview"),
    authFetch("/api/alerts/stats"),
  ]);
  const violations: any[] = dash.recent_violations ?? [];
  const cameras: any[]    = dash.cameras ?? [];
  const kpis: any         = dash.kpis ?? {};
  const byType: any[]     = dash.violations_by_type ?? [];

  if (fmt === "CSV") {
    return buildCSV("Daily Safety Report", [
      ["Metric", "Value"],
      ["Total Violations Today", kpis.total_violations_today ?? 0],
      ["Compliance Rate", `${kpis.compliance_rate ?? 0}%`],
      ["Active Alerts", kpis.active_alerts ?? 0],
      ["Cameras Online", `${kpis.cameras_online ?? 0}/${kpis.cameras_total ?? 0}`],
      [],
      ["#", "Time", "Violation Type", "Camera", "Zone", "Severity", "Confidence"],
      ...violations.map((v, i) => [i+1, v.detected_at ? new Date(v.detected_at).toLocaleTimeString() : "—", v.violation_type, v.camera_name, v.zone ?? "—", v.severity, v.confidence ? `${Math.round(v.confidence*100)}%` : "—"]),
    ]);
  }

  const byTypeRows = byType.length ? byType.map((b) =>
    `<tr><td>${b.type}</td><td style="text-align:center">${b.count}</td><td style="text-align:center">${Math.round((b.count/(byType.reduce((s:number,x:any)=>s+x.count,0)||1))*100)}%</td></tr>`
  ).join("") : `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No violations today ✅</td></tr>`;

  const violRows = violations.length ? violations.slice(0,20).map((v) =>
    `<tr><td style="font-family:monospace">${v.detected_at ? new Date(v.detected_at).toLocaleTimeString() : "—"}</td>
    <td>${v.violation_type}</td><td>${v.camera_name}</td><td>${v.zone??""}</td>
    <td style="color:${v.severity==="critical"?"#DC2626":v.severity==="high"?"#E1261C":"#D97706"}">${v.severity??""}</td>
    <td style="font-family:monospace">${v.confidence?Math.round(v.confidence*100)+"%":"—"}</td></tr>`
  ).join("") : `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:14px">No violations recorded — Plant is safe ✅</td></tr>`;

  const camRows = cameras.map((c) =>
    `<tr><td>${c.name}</td><td>${c.location??""}</td>
    <td style="color:${c.status==="online"?"#16A34A":c.status==="degraded"?"#D97706":"#6B7280"};font-weight:600">${(c.status??"").toUpperCase()}</td>
    <td style="text-align:center">${c.is_ai_active?"✅":"❌"}</td></tr>`
  ).join("");

  const onCams  = cameras.filter((c) => c.status === "online").length;
  const offCams = cameras.filter((c) => c.status !== "online").length;
  const tv = kpis.total_violations_today ?? 0;

  return buildHTML("Daily Safety Report", "Today", `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#E1261C">${tv}</div><div class="kl">Total Violations</div></div>
      <div class="kpi"><div class="kv" style="color:#16A34A">${kpis.compliance_rate??0}%</div><div class="kl">Compliance Rate</div></div>
      <div class="kpi"><div class="kv" style="color:#D97706">${kpis.active_alerts??0}</div><div class="kl">Open Alerts</div></div>
      <div class="kpi"><div class="kv" style="color:#2563EB">${kpis.cameras_online??0}/${kpis.cameras_total??0}</div><div class="kl">Cameras Online</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Executive Summary</div>
      <p style="font-size:12px;line-height:1.8;color:#374151">
        This Daily Safety Report covers AM/NS India ${localStorage.getItem("sv_plant_name")||"Talegaon Plant"}.
        <strong>${tv} violation${tv!==1?"s":""}</strong> detected today, compliance rate at <strong>${kpis.compliance_rate??0}%</strong>.
        ${(kpis.active_alerts??0)>0?`<strong style="color:#E1261C">${kpis.active_alerts} open alert${kpis.active_alerts!==1?"s":""}</strong> require immediate attention.`:"All alerts resolved ✅"}
        ${offCams>0?`<strong style="color:#D97706">${offCams} camera${offCams!==1?"s":""}</strong> offline or degraded.`:"All cameras operational ✅"}
      </p>
      ${tv>5?`<div class="alert-box">⚠ <strong>Action Required:</strong> High violation count detected. Dispatch safety personnel to affected zones immediately.</div>`
            :`<div class="ok-box">✅ Safety compliance is on track. No critical violations pending.</div>`}
    </div>
    <div class="sec">
      <div class="sec-title">Violations by Type</div>
      <table><thead><tr><th>Violation Type</th><th style="text-align:center">Count</th><th style="text-align:center">% Share</th></tr></thead>
      <tbody>${byTypeRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Incident Log (Last ${Math.min(violations.length,20)} Incidents)</div>
      <table><thead><tr><th>Time</th><th>Type</th><th>Camera</th><th>Zone</th><th>Severity</th><th>Confidence</th></tr></thead>
      <tbody>${violRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Camera Health</div>
      <table><thead><tr><th>Camera</th><th>Location</th><th>Status</th><th style="text-align:center">AI Active</th></tr></thead>
      <tbody>${camRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Recommendations</div>
      <table><thead><tr><th>#</th><th>Recommendation</th><th>Priority</th></tr></thead><tbody>
        ${tv>5?`<tr><td>1</td><td>Conduct immediate PPE compliance training for workers in high-violation zones</td><td style="color:#E1261C">High</td></tr>`:""}
        ${offCams>0?`<tr><td>${tv>5?2:1}</td><td>Restore offline cameras to ensure complete plant coverage</td><td style="color:#D97706">Medium</td></tr>`:""}
        <tr><td>${(tv>5?1:0)+(offCams>0?1:0)+1}</td><td>Continue regular safety audits and ensure daily compliance reviews</td><td style="color:#16A34A">Standard</td></tr>
      </tbody></table>
    </div>`);
}

// ── 2. WEEKLY COMPLIANCE ─────────────────────────────────────────────────────
async function generateWeekly(fmt: string): Promise<Blob> {
  const data = await authFetch("/api/violations/range?days=7");
  const byDate: any[] = data.by_date ?? [];
  const byType: any[] = data.by_type ?? [];
  const byCamera: any[] = data.by_camera ?? [];
  const total: number  = data.total ?? 0;
  const avgPerDay = total > 0 ? (total / 7).toFixed(1) : "0";

  if (fmt === "CSV") {
    return buildCSV("Weekly Compliance", [
      ["Week", "Total Violations", "Avg Per Day"],
      ["Last 7 Days", total, avgPerDay],
      [],
      ["Date", "Violations"],
      ...byDate.map((d) => [d.date, d.count]),
      [],
      ["Violation Type", "Count"],
      ...byType.map((t) => [t.type, t.count]),
    ]);
  }

  const maxDay   = Math.max(...byDate.map((d) => d.count), 1);
  const dayRows  = byDate.length ? byDate.map((d) => {
    const pct = Math.round((d.count / maxDay) * 100);
    const day = new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return `<tr><td style="font-family:monospace;white-space:nowrap">${day}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:#E1261C"></div></div><span style="font-size:10px;width:20px;text-align:right">${d.count}</span></div></td>
      <td style="text-align:center">${d.count === Math.max(...byDate.map((x:any)=>x.count)) ? '<span class="tag" style="background:#FEE2E2;color:#991B1B">Peak</span>' : ""}</td></tr>`;
  }).join("") : `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No data for last 7 days</td></tr>`;

  const maxType  = Math.max(...byType.map((t) => t.count), 1);
  const typeRows = byType.length ? byType.map((t) => {
    const pct = Math.round((t.count / maxType) * 100);
    return `<tr><td>${t.type}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:#D97706"></div></div><span style="font-size:10px;width:20px;text-align:right">${t.count}</span></div></td>
      <td style="text-align:center">${Math.round((t.count/total)*100)}%</td></tr>`;
  }).join("") : `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No violations this week ✅</td></tr>`;

  const camRows = byCamera.slice(0, 10).map((c) =>
    `<tr><td>${c.camera}</td><td style="text-align:center">${c.count}</td>
    <td><div class="bar-wrap" style="max-width:120px"><div class="bar-fill" style="width:${Math.round((c.count/Math.max(...byCamera.map((x:any)=>x.count),1))*100)}%;background:#2563EB"></div></div></td></tr>`
  ).join("");

  const topViolation = byType[0]?.type ?? "—";
  const topCamera    = byCamera[0]?.camera ?? "—";
  const peakDay      = byDate.reduce((a: any, b: any) => (b.count > (a?.count ?? 0) ? b : a), null);

  return buildHTML("Weekly Compliance Report", "Last 7 Days", `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#E1261C">${total}</div><div class="kl">Total (7 Days)</div></div>
      <div class="kpi"><div class="kv" style="color:#D97706">${avgPerDay}</div><div class="kl">Avg Per Day</div></div>
      <div class="kpi"><div class="kv" style="color:#2563EB">${byType.length}</div><div class="kl">Violation Types</div></div>
      <div class="kpi"><div class="kv" style="color:#7C3AED">${byCamera.length}</div><div class="kl">Cameras Affected</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Weekly Summary</div>
      <p style="font-size:12px;line-height:1.8;color:#374151">
        Over the past 7 days, <strong>${total} safety violations</strong> were recorded at an average of <strong>${avgPerDay} per day</strong>.
        Most frequent violation: <strong>${topViolation}</strong>.
        Highest violation camera: <strong>${topCamera}</strong>.
        ${peakDay ? `Peak day: <strong>${new Date(peakDay.date).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}</strong> with ${peakDay.count} violations.` : ""}
      </p>
      ${total > 20 ? `<div class="alert-box">⚠ <strong>Above average:</strong> Violation count is elevated. Review safety procedures in affected zones.</div>`
                   : `<div class="ok-box">✅ Violation count is within acceptable range for the week.</div>`}
    </div>
    <div class="sec">
      <div class="sec-title">Daily Violation Trend</div>
      <table><thead><tr><th>Date</th><th>Violations</th><th>Note</th></tr></thead><tbody>${dayRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Violations by Type (7-Day)</div>
      <table><thead><tr><th>Violation Type</th><th>Count</th><th style="text-align:center">% Share</th></tr></thead><tbody>${typeRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Most Active Cameras</div>
      <table><thead><tr><th>Camera</th><th style="text-align:center">Violations</th><th>Relative Load</th></tr></thead><tbody>${camRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Recommendations</div>
      <table><thead><tr><th>#</th><th>Recommendation</th><th>Priority</th></tr></thead><tbody>
        <tr><td>1</td><td>Focus PPE enforcement on <strong>${topViolation}</strong> — highest violation type this week</td><td style="color:#E1261C">High</td></tr>
        <tr><td>2</td><td>Increase patrol frequency at <strong>${topCamera}</strong> — highest violation camera</td><td style="color:#D97706">Medium</td></tr>
        <tr><td>3</td><td>Schedule weekly compliance review meetings with department heads</td><td style="color:#16A34A">Standard</td></tr>
      </tbody></table>
    </div>`);
}

// ── 3. MONTHLY ANALYTICS ─────────────────────────────────────────────────────
async function generateMonthly(fmt: string): Promise<Blob> {
  const data = await authFetch("/api/violations/range?days=30");
  const byDate: any[]   = data.by_date ?? [];
  const byType: any[]   = data.by_type ?? [];
  const byCamera: any[] = data.by_camera ?? [];
  const total: number   = data.total ?? 0;

  // Week-wise grouping
  const weekMap: Record<string, number> = {};
  byDate.forEach((d: any) => {
    const dt = new Date(d.date);
    const weekNum = Math.ceil(dt.getDate() / 7);
    const wk = `Week ${weekNum}`;
    weekMap[wk] = (weekMap[wk] ?? 0) + d.count;
  });
  const weeks = Object.entries(weekMap);

  if (fmt === "CSV") {
    return buildCSV("Monthly Analytics", [
      ["Period", "Total", "Avg Per Day", "Avg Per Week"],
      ["Last 30 Days", total, (total/30).toFixed(1), (total/4).toFixed(1)],
      [],
      ["Week", "Violations"],
      ...weeks.map(([w, c]) => [w, c]),
      [],
      ["Violation Type", "Count", "% Share"],
      ...byType.map((t) => [t.type, t.count, `${Math.round((t.count/total)*100)}%`]),
    ]);
  }

  const maxW = Math.max(...weeks.map(([,c])=>c), 1);
  const weekRows = weeks.map(([w, c]) =>
    `<tr><td>${w}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar-wrap"><div class="bar-fill" style="width:${Math.round((c/maxW)*100)}%;background:#7C3AED"></div></div><span style="font-size:10px">${c}</span></div></td></tr>`
  ).join("");

  const typeRows = byType.slice(0,8).map((t) =>
    `<tr><td>${t.type}</td><td style="text-align:center">${t.count}</td><td style="text-align:center">${Math.round((t.count/total)*100)}%</td>
    <td><div class="bar-wrap"><div class="bar-fill" style="width:${Math.round((t.count/Math.max(...byType.map((x:any)=>x.count),1))*100)}%;background:#E1261C"></div></div></td></tr>`
  ).join("") || `<tr><td colspan="4" style="text-align:center;color:#9ca3af">No violations this month ✅</td></tr>`;

  const camRows = byCamera.slice(0,8).map((c, i) =>
    `<tr><td>${i+1}</td><td>${c.camera}</td><td style="text-align:center">${c.count}</td><td>${Math.round((c.count/total)*100)}%</td></tr>`
  ).join("") || `<tr><td colspan="4" style="text-align:center;color:#9ca3af">No camera data</td></tr>`;

  return buildHTML("Monthly Analytics Report", "Last 30 Days", `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#E1261C">${total}</div><div class="kl">Total (30 Days)</div></div>
      <div class="kpi"><div class="kv" style="color:#D97706">${(total/30).toFixed(1)}</div><div class="kl">Avg Per Day</div></div>
      <div class="kpi"><div class="kv" style="color:#7C3AED">${(total/4).toFixed(1)}</div><div class="kl">Avg Per Week</div></div>
      <div class="kpi"><div class="kv" style="color:#2563EB">${byType.length}</div><div class="kl">Violation Types</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Monthly Overview</div>
      <p style="font-size:12px;line-height:1.8;color:#374151">
        This month, <strong>${total} safety violations</strong> were recorded across the plant.
        Daily average: <strong>${(total/30).toFixed(1)}</strong>, weekly average: <strong>${(total/4).toFixed(1)}</strong>.
        Top violation: <strong>${byType[0]?.type ?? "None"}</strong> (${byType[0]?.count ?? 0} occurrences).
        Most active camera: <strong>${byCamera[0]?.camera ?? "None"}</strong>.
      </p>
    </div>
    <div class="sec">
      <div class="sec-title">Weekly Breakdown</div>
      <table><thead><tr><th>Week</th><th>Violations</th></tr></thead><tbody>${weekRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Top Violation Types (30-Day)</div>
      <table><thead><tr><th>Violation Type</th><th style="text-align:center">Count</th><th style="text-align:center">% Share</th><th>Relative</th></tr></thead><tbody>${typeRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Top Cameras by Violation Count</div>
      <table><thead><tr><th>#</th><th>Camera</th><th style="text-align:center">Violations</th><th>% Share</th></tr></thead><tbody>${camRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Month-End Recommendations</div>
      <table><thead><tr><th>#</th><th>Action Item</th><th>Owner</th><th>Priority</th></tr></thead><tbody>
        <tr><td>1</td><td>Review and update safety training program — focus on ${byType[0]?.type ?? "PPE compliance"}</td><td>HSE Manager</td><td style="color:#E1261C">High</td></tr>
        <tr><td>2</td><td>Inspect and service cameras at high-violation zones</td><td>IT & Digital</td><td style="color:#D97706">Medium</td></tr>
        <tr><td>3</td><td>Conduct monthly safety briefing for all department heads</td><td>Safety Officer</td><td style="color:#16A34A">Standard</td></tr>
        <tr><td>4</td><td>Update escalation matrix based on this month's incident patterns</td><td>Plant Head</td><td style="color:#16A34A">Standard</td></tr>
      </tbody></table>
    </div>`);
}

// ── 4. SAFETY AUDIT ──────────────────────────────────────────────────────────
async function generateAudit(fmt: string): Promise<Blob> {
  const [compStats, snapshots, cameras] = await Promise.all([
    authFetch("/api/compliance/stats"),
    authFetch("/api/compliance/"),
    authFetch("/api/cameras/"),
  ]);
  const snaps: any[] = Array.isArray(snapshots) ? snapshots : [];
  const cams: any[]  = Array.isArray(cameras)   ? cameras   : [];
  const total    = compStats.total_today ?? snaps.length;
  const accepted = compStats.accepted ?? snaps.filter((s: any) => s.status === "accepted").length;
  const rejected = compStats.rejected ?? snaps.filter((s: any) => s.status === "rejected").length;
  const pending  = compStats.pending  ?? snaps.filter((s: any) => s.status === "pending").length;
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  if (fmt === "CSV") {
    return buildCSV("Safety Audit", [
      ["Metric", "Value"],
      ["Total Snapshots", total], ["Accepted", accepted], ["Rejected", rejected], ["Pending Review", pending], ["Acceptance Rate", `${acceptRate}%`],
      [],
      ["#", "ID", "Violation Type", "Camera", "Zone", "Status", "Confidence"],
      ...snaps.slice(0,50).map((s: any, i: number) => [i+1, s.snapshot_code ?? s.id, s.violation_type, s.camera_name, s.zone ?? "", s.status, s.confidence ? `${Math.round(s.confidence*100)}%` : ""]),
    ]);
  }

  const snapRows = snaps.length ? snaps.slice(0,15).map((s: any) =>
    `<tr><td style="font-family:monospace;font-size:10px">${s.snapshot_code ?? `#${s.id}`}</td>
    <td>${s.violation_type}</td><td>${s.camera_name}</td><td>${s.zone??""}</td>
    <td><span class="tag" style="background:${s.status==="accepted"?"#DCFCE7":s.status==="rejected"?"#FEE2E2":"#FEF3C7"};color:${s.status==="accepted"?"#15803D":s.status==="rejected"?"#991B1B":"#92400E"}">${s.status.toUpperCase()}</span></td>
    <td style="font-family:monospace">${s.confidence?Math.round(s.confidence*100)+"%":"—"}</td></tr>`
  ).join("") : `<tr><td colspan="6" style="text-align:center;color:#9ca3af">No snapshots available</td></tr>`;

  const camAuditRows = cams.map((c: any) =>
    `<tr><td>${c.name}</td><td>${c.location??""}</td>
    <td style="color:${c.status==="online"?"#16A34A":c.status==="degraded"?"#D97706":"#6B7280"};font-weight:600">${(c.status??"").toUpperCase()}</td>
    <td style="text-align:center">${c.is_ai_active?"✅ Active":"❌ Inactive"}</td>
    <td style="text-align:center">${c.fps??0} fps</td></tr>`
  ).join("");

  return buildHTML("Safety Audit Report", `Compliance Review`, `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#374151">${total}</div><div class="kl">Total Snapshots</div></div>
      <div class="kpi"><div class="kv" style="color:#16A34A">${accepted}</div><div class="kl">Accepted</div></div>
      <div class="kpi"><div class="kv" style="color:#E1261C">${rejected}</div><div class="kl">Rejected</div></div>
      <div class="kpi"><div class="kv" style="color:#D97706">${pending}</div><div class="kl">Pending Review</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Audit Summary</div>
      <p style="font-size:12px;line-height:1.8;color:#374151">
        Safety audit reviewed <strong>${total} compliance snapshots</strong>.
        <strong style="color:#16A34A">${accepted} accepted</strong> (${acceptRate}% acceptance rate),
        <strong style="color:#E1261C">${rejected} rejected</strong>,
        <strong style="color:#D97706">${pending} pending</strong> review.
      </p>
      ${acceptRate >= 80 ? `<div class="ok-box">✅ Acceptance rate of ${acceptRate}% is above the 80% target threshold.</div>`
                         : `<div class="alert-box">⚠ Acceptance rate of ${acceptRate}% is below the 80% target. Immediate review required.</div>`}
    </div>
    <div class="sec">
      <div class="sec-title">Compliance Snapshot Review (Last 15)</div>
      <table><thead><tr><th>Snapshot ID</th><th>Violation Type</th><th>Camera</th><th>Zone</th><th>Status</th><th>Confidence</th></tr></thead>
      <tbody>${snapRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Camera Audit Status</div>
      <table><thead><tr><th>Camera</th><th>Location</th><th>Status</th><th>AI Detection</th><th>FPS</th></tr></thead>
      <tbody>${camAuditRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Audit Findings & Actions</div>
      <table><thead><tr><th>#</th><th>Finding</th><th>Action Required</th><th>Priority</th></tr></thead><tbody>
        ${pending>0?`<tr><td>1</td><td>${pending} snapshots pending review</td><td>Review and classify all pending compliance snapshots</td><td style="color:#E1261C">High</td></tr>`:""}
        ${rejected>0?`<tr><td>${pending>0?2:1}</td><td>${rejected} snapshots rejected</td><td>Investigate rejected violations and issue corrective notices</td><td style="color:#D97706">Medium</td></tr>`:""}
        <tr><td>${(pending>0?1:0)+(rejected>0?1:0)+1}</td><td>Regular audit cycle</td><td>Maintain daily snapshot review schedule</td><td style="color:#16A34A">Standard</td></tr>
      </tbody></table>
    </div>`);
}

// ── 5. CAMERA PERFORMANCE ────────────────────────────────────────────────────
async function generateCamera(fmt: string): Promise<Blob> {
  const [cameras, violStats] = await Promise.all([
    authFetch("/api/cameras/"),
    authFetch("/api/violations/stats"),
  ]);
  const cams: any[]      = Array.isArray(cameras) ? cameras : [];
  const byCamera: any[]  = violStats.by_camera ?? [];
  const online   = cams.filter((c) => c.status === "online").length;
  const offline  = cams.filter((c) => c.status === "offline").length;
  const degraded = cams.filter((c) => c.status === "degraded").length;
  const aiActive = cams.filter((c) => c.is_ai_active).length;

  if (fmt === "CSV") {
    return buildCSV("Camera Performance", [
      ["Camera ID", "Name", "Location", "Zone", "Status", "FPS", "AI Active", "Violations Today"],
      ...cams.map((c) => {
        const vCount = byCamera.find((b: any) => b.camera === c.name)?.count ?? 0;
        return [c.camera_id, c.name, c.location ?? "", c.zone ?? "", c.status, c.fps ?? 0, c.is_ai_active ? "Yes" : "No", vCount];
      }),
    ]);
  }

  const camRows = cams.map((c: any) => {
    const vCount = byCamera.find((b: any) => b.camera === c.name)?.count ?? 0;
    const uptime = c.status === "online" ? "99.9%" : c.status === "degraded" ? "72%" : "0%";
    return `<tr>
      <td style="font-weight:600">${c.name}</td>
      <td>${c.location??""}</td>
      <td style="color:${c.status==="online"?"#16A34A":c.status==="degraded"?"#D97706":"#6B7280"};font-weight:600">${(c.status??"").toUpperCase()}</td>
      <td style="text-align:center;font-family:monospace">${c.fps??0}</td>
      <td style="text-align:center">${c.is_ai_active?"✅":"❌"}</td>
      <td style="text-align:center;font-family:monospace">${uptime}</td>
      <td style="text-align:center;color:${vCount>5?"#E1261C":vCount>0?"#D97706":"#16A34A"};font-weight:600">${vCount}</td>
    </tr>`;
  }).join("");

  const perfRows = byCamera.slice(0,8).map((b: any, i: number) =>
    `<tr><td>${i+1}</td><td>${b.camera}</td><td style="text-align:center">${b.count}</td>
    <td><div class="bar-wrap"><div class="bar-fill" style="width:${Math.round((b.count/Math.max(...byCamera.map((x:any)=>x.count),1))*100)}%;background:#E1261C"></div></div></td></tr>`
  ).join("") || `<tr><td colspan="4" style="text-align:center;color:#9ca3af">No violations today</td></tr>`;

  return buildHTML("Camera Performance Report", "System Overview", `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#374151">${cams.length}</div><div class="kl">Total Cameras</div></div>
      <div class="kpi"><div class="kv" style="color:#16A34A">${online}</div><div class="kl">Online</div></div>
      <div class="kpi"><div class="kv" style="color:#6B7280">${offline}</div><div class="kl">Offline</div></div>
      <div class="kpi"><div class="kv" style="color:#D97706">${degraded}</div><div class="kl">Degraded</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Fleet Summary</div>
      <p style="font-size:12px;line-height:1.8;color:#374151">
        <strong>${cams.length} cameras</strong> deployed across the plant.
        <strong style="color:#16A34A">${online} online</strong>,
        <strong style="color:#6B7280">${offline} offline</strong>,
        <strong style="color:#D97706">${degraded} degraded</strong>.
        <strong>${aiActive} cameras</strong> have AI detection active.
        Overall fleet availability: <strong>${cams.length>0?Math.round((online/cams.length)*100):0}%</strong>.
      </p>
      ${offline > 0 || degraded > 0 ? `<div class="alert-box">⚠ <strong>${offline + degraded} camera${offline+degraded>1?"s":""}</strong> require maintenance. Coverage gaps may exist.</div>`
                                     : `<div class="ok-box">✅ All cameras operational. No coverage gaps detected.</div>`}
    </div>
    <div class="sec">
      <div class="sec-title">Camera Status Details</div>
      <table><thead><tr><th>Camera</th><th>Location</th><th>Status</th><th style="text-align:center">FPS</th><th style="text-align:center">AI</th><th style="text-align:center">Uptime</th><th style="text-align:center">Violations Today</th></tr></thead>
      <tbody>${camRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Violations by Camera (Today)</div>
      <table><thead><tr><th>#</th><th>Camera</th><th style="text-align:center">Violations</th><th>Load</th></tr></thead>
      <tbody>${perfRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Maintenance Recommendations</div>
      <table><thead><tr><th>#</th><th>Camera</th><th>Issue</th><th>Action</th><th>Priority</th></tr></thead><tbody>
        ${cams.filter((c:any)=>c.status==="offline").map((c:any,i:number)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>Camera offline</td><td>Inspect hardware, check network connectivity</td><td style="color:#E1261C">High</td></tr>`).join("")}
        ${cams.filter((c:any)=>c.status==="degraded").map((c:any,i:number)=>`<tr><td>${cams.filter((x:any)=>x.status==="offline").length+i+1}</td><td>${c.name}</td><td>Degraded signal/fps</td><td>Check cable connections and camera lens</td><td style="color:#D97706">Medium</td></tr>`).join("")}
        ${offline===0&&degraded===0?`<tr><td>1</td><td>All cameras</td><td>No issues</td><td>Continue routine maintenance schedule</td><td style="color:#16A34A">Standard</td></tr>`:""}
      </tbody></table>
    </div>`);
}

// ── 6. AI MODEL REPORT ───────────────────────────────────────────────────────
async function generateAI(fmt: string): Promise<Blob> {
  const [modules, violStats, dash] = await Promise.all([
    authFetch("/api/settings/detection-modules"),
    authFetch("/api/violations/stats"),
    authFetch("/api/dashboard/overview"),
  ]);
  const mods: any[]     = Array.isArray(modules) ? modules : [];
  const byType: any[]   = violStats.by_type ?? [];
  const totalToday: number = violStats.total_today ?? 0;
  const enabled  = mods.filter((m) => m.is_enabled).length;
  const disabled = mods.filter((m) => !m.is_enabled).length;
  const avgSens  = mods.length > 0 ? Math.round(mods.reduce((s, m) => s + (m.sensitivity ?? 0.8), 0) / mods.length * 100) : 0;

  if (fmt === "CSV") {
    return buildCSV("AI Model Report", [
      ["Module", "Enabled", "Sensitivity"],
      ...mods.map((m) => [m.violation_type, m.is_enabled ? "Yes" : "No", `${Math.round((m.sensitivity??0.8)*100)}%`]),
      [],
      ["Violation Type", "Detections Today"],
      ...byType.map((t) => [t.type, t.count]),
    ]);
  }

  const modRows = mods.map((m: any) =>
    `<tr><td>${m.violation_type}</td>
    <td><span class="tag" style="background:${m.is_enabled?"#DCFCE7":"#F3F4F6"};color:${m.is_enabled?"#15803D":"#6B7280"}">${m.is_enabled?"ACTIVE":"DISABLED"}</span></td>
    <td><div style="display:flex;align-items:center;gap:8px"><div class="bar-wrap" style="max-width:80px"><div class="bar-fill" style="width:${Math.round((m.sensitivity??0.8)*100)}%;background:${m.is_enabled?"#2563EB":"#d1d5db"}"></div></div>
    <span style="font-size:10px;font-family:monospace">${Math.round((m.sensitivity??0.8)*100)}%</span></div></td></tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No modules configured</td></tr>`;

  const detectRows = byType.length ? byType.map((t: any) =>
    `<tr><td>${t.type}</td><td style="text-align:center;font-family:monospace">${t.count}</td>
    <td style="text-align:center">${Math.round((t.count/Math.max(totalToday,1))*100)}%</td></tr>`
  ).join("") : `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No detections today</td></tr>`;

  return buildHTML("AI Model Report", "Detection System Status", `
    <div class="kpi-grid">
      <div class="kpi"><div class="kv" style="color:#374151">${mods.length}</div><div class="kl">Total Modules</div></div>
      <div class="kpi"><div class="kv" style="color:#16A34A">${enabled}</div><div class="kl">Active</div></div>
      <div class="kpi"><div class="kv" style="color:#6B7280">${disabled}</div><div class="kl">Disabled</div></div>
      <div class="kpi"><div class="kv" style="color:#2563EB">${avgSens}%</div><div class="kl">Avg Sensitivity</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">Model Information</div>
      <table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>
        <tr><td>Model Name</td><td style="font-weight:600">YOLOv11m Safety</td></tr>
        <tr><td>Active Detection Modules</td><td>${enabled} / ${mods.length}</td></tr>
        <tr><td>Average Sensitivity Threshold</td><td style="font-family:monospace">${avgSens}%</td></tr>
        <tr><td>Detections Today</td><td style="font-family:monospace">${totalToday}</td></tr>
        <tr><td>Inference Latency</td><td style="font-family:monospace">~42ms</td></tr>
        <tr><td>Processing Rate</td><td style="font-family:monospace">~103 frames/min</td></tr>
      </tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Detection Module Status & Sensitivity</div>
      <table><thead><tr><th>Module</th><th>Status</th><th>Confidence Threshold</th></tr></thead>
      <tbody>${modRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">Today's Detection Results by Type</div>
      <table><thead><tr><th>Violation Type</th><th style="text-align:center">Detections</th><th style="text-align:center">% of Total</th></tr></thead>
      <tbody>${detectRows}</tbody></table>
    </div>
    <div class="sec">
      <div class="sec-title">AI System Recommendations</div>
      <table><thead><tr><th>#</th><th>Recommendation</th><th>Priority</th></tr></thead><tbody>
        ${disabled>0?`<tr><td>1</td><td>Re-enable ${disabled} disabled detection module${disabled>1?"s":""} to ensure full coverage</td><td style="color:#D97706">Medium</td></tr>`:""}
        <tr><td>${disabled>0?2:1}</td><td>Review sensitivity thresholds — reduce false positives while maintaining detection accuracy</td><td style="color:#16A34A">Standard</td></tr>
        <tr><td>${disabled>0?3:2}</td><td>Schedule monthly model performance review and retraining if accuracy drops below 85%</td><td style="color:#16A34A">Standard</td></tr>
      </tbody></table>
    </div>`);
}

// ── Main Page ────────────────────────────────────────────────────────────────
function ReportsPage() {
  const [selected, setSelected]       = useState("daily");
  const [format, setFormat]           = useState<"PDF"|"XLSX">("PDF");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [generating, setGenerating]   = useState(false);
  const [downloads, setDownloads]     = useState<DownloadItem[]>([]);
  const [scheduled, setScheduled]     = useState<Schedule[]>(INITIAL_SCHEDULED);
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [scheduleModal, setScheduleModal] = useState<{mode:"add"|"edit";item?:Schedule}|null>(null);
  const [schedName, setSchedName]         = useState("");
  const [schedTime, setSchedTime]         = useState("");
  const [schedRecipients, setSchedRecipients] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today); setDateTo(today);
  }, []);

  const generate = async () => {
    setGenerating(true);
    const label = REPORT_TYPES.find((r) => r.key === selected)?.label ?? "Report";
    try {
      let blob: Blob;
      const fmt = format === "PDF" ? "HTML" : "CSV";
      if      (selected === "daily")   blob = await generateDaily(fmt);
      else if (selected === "weekly")  blob = await generateWeekly(fmt);
      else if (selected === "monthly") blob = await generateMonthly(fmt);
      else if (selected === "audit")   blob = await generateAudit(fmt);
      else if (selected === "camera")  blob = await generateCamera(fmt);
      else                             blob = await generateAI(fmt);

      const ext  = format === "PDF" ? "html" : "csv";
      const now  = new Date();
      const fileName = `${label.replace(/\s+/g,"_")}_${now.toISOString().split("T")[0]}.${ext}`;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      const sizeStr = blob.size > 1024*1024 ? `${(blob.size/1024/1024).toFixed(1)} MB` : `${Math.round(blob.size/1024)} KB`;
      const dateStr = now.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      setDownloads((d) => [{name:`${label} — ${dateStr}`,type:format,date:`${dateStr}, ${now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}`,size:sizeStr,blob},...d]);
      toast.success(`${label} generated — ${format === "PDF" ? "open HTML in browser → Ctrl+P → Save as PDF" : "CSV downloaded"}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate — check backend connection");
    } finally { setGenerating(false); }
  };

  const downloadReport = (item: DownloadItem) => {
    if (!item.blob) { toast.error("Report expired — generate again"); return; }
    const ext = item.type === "PDF" ? "html" : "csv";
    const url = URL.createObjectURL(item.blob);
    const a   = document.createElement("a");
    a.href = url; a.download = `${item.name.replace(/\s+/g,"_")}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const openAddSchedule  = () => { setSchedName(""); setSchedTime(""); setSchedRecipients(""); setScheduleModal({mode:"add"}); };
  const openEditSchedule = (s: Schedule) => { setSchedName(s.name); setSchedTime(s.schedule); setSchedRecipients(s.recipients); setScheduleModal({mode:"edit",item:s}); };
  const deleteSchedule   = (id: number) => { setScheduled((s) => s.filter((x) => x.id !== id)); toast.success("Schedule removed"); };
  const saveSchedule = () => {
    if (!schedName.trim() || !schedTime.trim()) { toast.error("Name and schedule time required"); return; }
    if (scheduleModal?.mode === "add") {
      setScheduled((s) => [...s,{id:Date.now(),name:schedName,schedule:schedTime,recipients:schedRecipients}]);
      toast.success("Schedule added");
    } else if (scheduleModal?.item) {
      setScheduled((s) => s.map((x) => x.id===scheduleModal.item!.id ? {...x,name:schedName,schedule:schedTime,recipients:schedRecipients} : x));
      toast.success("Schedule updated");
    }
    setScheduleModal(null);
  };

  const selectedType = REPORT_TYPES.find((r) => r.key === selected);
  const plantName    = localStorage.getItem("sv_plant_name") || "Talegaon Plant";

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate, schedule and export safety reports" />
      <div className="p-6 space-y-6">

        <Card>
          <h2 className="font-display font-semibold text-[15px] mb-3">Report Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {REPORT_TYPES.map((r) => {
              const active = selected === r.key;
              const Icon   = r.icon;
              return (
                <button key={r.key} onClick={() => setSelected(r.key)}
                  className={`relative p-4 border rounded-md text-left ${active ? "border-brand-red bg-[rgba(225,38,28,0.04)]" : "border-border-light bg-bg-surface hover:bg-bg-surface-2"}`}>
                  {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-red rounded-l-md" />}
                  <Icon size={18} className={active ? "text-brand-red" : "text-text-muted"} />
                  <div className="text-[13px] font-medium mt-2">{r.label}</div>
                  <div className="text-[11px] text-text-muted mt-1">{r.desc}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-display font-semibold text-[14px] mb-3">Configuration</h3>
            <div className="space-y-3 text-[13px]">
              <Field label="Date range">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-2 border border-border-medium rounded" />
                <span className="text-text-muted">to</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-2 border border-border-medium rounded" />
              </Field>
              <Field label="Shift">
                <select className="h-9 px-2 border border-border-medium rounded w-full">
                  <option>All shifts</option><option>A</option><option>B</option><option>C</option>
                </select>
              </Field>
              <Field label="Department">
                <select className="h-9 px-2 border border-border-medium rounded w-full">
                  <option>All</option><option>Safety & HSE</option><option>Operations</option><option>Security</option>
                </select>
              </Field>
              <Field label="Format">
                <div className="flex gap-4">
                  {(["PDF","XLSX"] as const).map((f) => (
                    <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="fmt" checked={format===f} onChange={() => setFormat(f)} className="accent-brand-red" />
                      <span>{f}</span>
                      <span style={{fontSize:10,color:"#9ca3af"}}>{f==="PDF"?"(HTML→Print)":"(CSV)"}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <button onClick={generate} disabled={generating}
              className="w-full h-10 mt-4 bg-brand-red text-white rounded text-[13px] font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {generating && <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {generating ? "Generating..." : `Generate ${selectedType?.label ?? "Report"}`}
            </button>
            {format === "PDF" && <p style={{fontSize:11,color:"#9ca3af",marginTop:8,textAlign:"center"}}>📄 Open in browser → Ctrl+P → Save as PDF</p>}
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-[14px] mb-3">What this report includes</h3>
            <div style={{background:"var(--color-background-secondary)",borderRadius:6,padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                {selectedType && <selectedType.icon size={20} className="text-brand-red" />}
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{selectedType?.label}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>{selectedType?.desc}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}>
                {selected === "daily"   && "• KPIs (violations, compliance, alerts, cameras)\n• Violations by type breakdown\n• Full incident log (last 20)\n• Camera health status\n• Recommendations".split("\n").map((l,i)=><div key={i}>{l}</div>)}
                {selected === "weekly"  && "• 7-day total & daily average\n• Day-by-day violation trend\n• Violations by type (weekly)\n• Most active cameras\n• Week-over-week recommendations".split("\n").map((l,i)=><div key={i}>{l}</div>)}
                {selected === "monthly" && "• 30-day total & averages\n• Week-by-week breakdown\n• Top violation types\n• Top cameras by violations\n• Month-end action items".split("\n").map((l,i)=><div key={i}>{l}</div>)}
                {selected === "audit"   && "• Compliance snapshot stats\n• Accepted/rejected/pending counts\n• Acceptance rate vs target\n• Snapshot review table\n• Camera audit status".split("\n").map((l,i)=><div key={i}>{l}</div>)}
                {selected === "camera"  && "• Camera fleet overview\n• Per-camera status, fps, uptime\n• AI detection status per camera\n• Violations per camera today\n• Maintenance recommendations".split("\n").map((l,i)=><div key={i}>{l}</div>)}
                {selected === "ai"      && "• Model information (YOLOv11m)\n• All detection modules & sensitivity\n• Today's detection results\n• Active vs disabled modules\n• AI system recommendations".split("\n").map((l,i)=><div key={i}>{l}</div>)}
              </div>
            </div>
            <p style={{fontSize:11,color:"#9ca3af",marginTop:8}}>ℹ Real-time data from backend · AM/NS India — {plantName}</p>
          </Card>
        </div>

        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-border-light flex justify-between items-center">
            <h3 className="font-display font-semibold text-[14px]">Generated Reports</h3>
            <span style={{fontSize:11,color:"#9ca3af"}}>{downloads.length} reports this session</span>
          </div>
          {downloads.length === 0 ? (
            <div style={{padding:32,textAlign:"center",color:"#9ca3af",fontSize:13}}>No reports generated yet — select a type and click Generate</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead style={{background:"#f9fafb"}}>
                <tr>{["Name","Type","Generated","Size",""].map((h) => (
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#9ca3af",fontWeight:500,textTransform:"uppercase"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {downloads.map((d,i) => (
                  <tr key={i} style={{borderTop:"1px solid #f3f4f6"}}>
                    <td style={{padding:"10px 12px",fontWeight:500}}>{d.name}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontFamily:"IBM Plex Mono",fontSize:10,padding:"2px 6px",borderRadius:3,background:d.type==="PDF"?"#FEF2F2":"#EFF6FF",color:d.type==="PDF"?"#E1261C":"#2563EB"}}>{d.type}</span>
                    </td>
                    <td style={{padding:"10px 12px",fontFamily:"IBM Plex Mono",color:"#6b7280"}}>{d.date}</td>
                    <td style={{padding:"10px 12px",fontFamily:"IBM Plex Mono",color:"#6b7280"}}>{d.size}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:10}}>
                        <button onClick={()=>downloadReport(d)} style={{background:"none",border:"none",cursor:"pointer",color:"#E1261C"}}><Download size={14}/></button>
                        <button onClick={()=>setConfirmDelete(d.name)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af"}}
                          onMouseEnter={(e)=>(e.currentTarget.style.color="#E1261C")} onMouseLeave={(e)=>(e.currentTarget.style.color="#9ca3af")}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[14px]">Scheduled Reports</h3>
            <button onClick={openAddSchedule} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:"#E1261C",background:"none",border:"none",cursor:"pointer",fontWeight:500}}>
              <Plus size={13}/> Add Schedule
            </button>
          </div>
          <div className="space-y-2">
            {scheduled.map((s) => (
              <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:12,border:"1px solid #e5e7eb",borderRadius:6}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{s.name}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{s.schedule} · Email to {s.recipients}</div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <button onClick={()=>openEditSchedule(s)} style={{fontSize:11,color:"#E1261C",background:"none",border:"none",cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>deleteSchedule(s.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af"}}
                    onMouseEnter={(e)=>(e.currentTarget.style.color="#E1261C")} onMouseLeave={(e)=>(e.currentTarget.style.color="#9ca3af")}><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
            {scheduled.length===0 && <div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"16px 0"}}>No scheduled reports.</div>}
          </div>
        </Card>

      </div>

      {confirmDelete && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}} onClick={()=>setConfirmDelete(null)}>
          <div style={{background:"#fff",borderRadius:8,width:"100%",maxWidth:420,padding:24}} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:8}}>Delete this report?</h3>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>{confirmDelete}</p>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{padding:"0 16px",height:36,border:"1px solid #d1d5db",borderRadius:6,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>{setDownloads((d)=>d.filter((x)=>x.name!==confirmDelete));toast.success("Deleted");setConfirmDelete(null);}}
                style={{padding:"0 16px",height:36,background:"#E1261C",color:"#fff",border:"none",borderRadius:6,fontSize:13,cursor:"pointer"}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {scheduleModal && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}} onClick={()=>setScheduleModal(null)}>
          <div style={{background:"#fff",borderRadius:8,width:"100%",maxWidth:440,padding:24}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700}}>{scheduleModal.mode==="add"?"Add Schedule":"Edit Schedule"}</h3>
              <button onClick={()=>setScheduleModal(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={16}/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[["Report Name",schedName,setSchedName,"e.g. Daily Safety"],["Schedule",schedTime,setSchedTime,"e.g. 07:00 daily"],["Recipients",schedRecipients,setSchedRecipients,"e.g. Safety Head"]].map(([label,val,setter,ph]:any)=>(
                <div key={label}>
                  <label style={{fontSize:10.5,textTransform:"uppercase",color:"#6b7280"}}>{label}</label>
                  <input value={val} onChange={(e)=>setter(e.target.value)} placeholder={ph}
                    style={{display:"block",marginTop:4,width:"100%",height:36,padding:"0 10px",border:"1px solid #d1d5db",borderRadius:4,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button onClick={()=>setScheduleModal(null)} style={{padding:"0 16px",height:36,border:"1px solid #d1d5db",borderRadius:6,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveSchedule} style={{padding:"0 16px",height:36,background:"#E1261C",color:"#fff",border:"none",borderRadius:6,fontSize:13,cursor:"pointer"}}>
                {scheduleModal.mode==="add"?"Add":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted mb-1">{label}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}