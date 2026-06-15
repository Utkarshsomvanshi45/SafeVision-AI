import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Donut } from "@/components/ui-kit";
import { useSentinelStore } from "@/lib/store";
import { CAMERAS } from "@/lib/data";
import { Cpu, Activity, HardDrive, Network, Server, AlertTriangle, CheckCircle2, Thermometer } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "Operational Health — SafeVision AI" }] }),
  component: HealthPage,
});

function HealthPage() {
  const { aiNodes, gpuAvg, latencyMs, inferenceQps } = useSentinelStore();
  const [latHistory, setLatHistory] = useState<{ t: number; v: number }[]>(
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 35 + Math.random() * 15 }))
  );

  useEffect(() => {
    setLatHistory((h) => [...h.slice(1), { t: (h[h.length - 1]?.t ?? 0) + 1, v: latencyMs }]);
  }, [latencyMs]);

  const onlineNodes = aiNodes.filter((n) => n.status === "online").length;
  const degradedNodes = aiNodes.filter((n) => n.status === "degraded").length;
  const camOnline = CAMERAS.filter((c) => c.status === "online").length;
  const camOffline = CAMERAS.filter((c) => c.status === "offline").length;

  return (
    <div>
      <PageHeader title="Operational Health Center" subtitle="AI infrastructure · network · storage · edge node telemetry" right={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-muted">SLA</span>
          <span className="px-2 py-1 rounded text-[11px] font-mono bg-[rgba(22,163,74,0.1)] text-[#16A34A] border border-[rgba(22,163,74,0.3)]">99.94% / 30d</span>
        </div>
      } />

      <div className="p-6 space-y-6">
        {/* System status banner */}
        <div className="bg-bg-panel border border-border-panel rounded-md p-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-text-on-dark">
          <Vital icon={Server} label="AI Nodes" value={`${onlineNodes}/${aiNodes.length}`} sub={`${degradedNodes} degraded`} color="#10B981" />
          <Vital icon={Cpu} label="GPU Avg" value={`${gpuAvg}%`} sub="across cluster" color="#2563EB" />
          <Vital icon={Activity} label="Inference" value={`${inferenceQps}`} sub="qps · all models" color="#7C3AED" />
          <Vital icon={Network} label="Cameras" value={`${camOnline}/${CAMERAS.length}`} sub={`${camOffline} offline`} color={camOffline > 0 ? "#EA580C" : "#10B981"} />
          <Vital icon={HardDrive} label="Storage" value="62%" sub="2.8/4.5 TB" color="#D97706" />
          <Vital icon={Thermometer} label="Avg Latency" value={`${latencyMs}ms`} sub="p50 inference" color="#10B981" />
        </div>

        {/* AI Nodes grid */}
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h2 className="font-display font-semibold text-[14px]">AI Inference Cluster</h2>
            <span className="text-[11px] text-text-muted font-mono">live · refreshed every 2.5s</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {aiNodes.map((n) => {
              const color = n.status === "online" ? "#10B981" : n.status === "degraded" ? "#D97706" : "#6B7280";
              const tempColor = n.temp > 75 ? "#E1261C" : n.temp > 70 ? "#D97706" : "#10B981";
              return (
                <div key={n.id} className="bg-bg-surface border border-border-light rounded-md p-3 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: color }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[13px] font-semibold">{n.label}</div>
                      <div className="text-[10.5px] text-text-muted font-mono">{n.region}</div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono uppercase" style={{ color }}>
                      <span className="w-1.5 h-1.5 rounded-full signal-pulse" style={{ background: color }} />
                      {n.status}
                    </div>
                  </div>
                  <div className="mt-2 text-[10.5px] text-text-muted">{n.gpu}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Metric label="GPU" value={`${n.gpuUtil}%`} color={n.gpuUtil > 85 ? "#E1261C" : n.gpuUtil > 70 ? "#D97706" : "#2563EB"} />
                    <Metric label="Temp" value={`${n.temp}°`} color={tempColor} />
                    <Metric label="FPS" value={`${n.fps}`} color="#10B981" />
                    <Metric label="qps" value={`${n.inferenceQps}`} color="#7C3AED" />
                  </div>
                  <div className="mt-2 h-1 bg-border-light rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-500" style={{ width: `${n.gpuUtil}%`, background: n.gpuUtil > 85 ? "#E1261C" : color }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>{n.modelVersion}</span>
                    <span>{n.latencyMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-[14px]">Inference Latency · 60s window</h2>
              <span className="text-[11px] font-mono text-text-muted">SLO: ≤ 60ms p95</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={latHistory}>
                <defs>
                  <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke="#6B7280" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="#2563EB" fill="url(#lat)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="font-display font-semibold text-[14px] mb-3">Deployment Health</h2>
            <div className="space-y-2 text-[12px]">
              {[
                { label: "Edge sync drift", value: "0.04s", ok: true },
                { label: "Last model rollout", value: "May 14, 09:12", ok: true },
                { label: "Config sync", value: "100%", ok: true },
                { label: "Auth gateway", value: "200 OK", ok: true },
                { label: "WhatsApp gateway", value: "Degraded", ok: false },
                { label: "Audit pipeline", value: "Streaming", ok: true },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border-light last:border-0">
                  <span className="text-text-secondary">{r.label}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: r.ok ? "#16A34A" : "#D97706" }}>
                    {r.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Storage gauges + network topology */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="font-display font-semibold text-[14px] mb-3">Storage · Video Retention</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Hot · 7d", v: 78, c: "#E1261C" },
                { l: "Warm · 30d", v: 54, c: "#D97706" },
                { l: "Cold · 1y", v: 31, c: "#10B981" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col items-center bg-bg-surface-2 rounded p-3">
                  <Donut value={s.v} size={70} stroke={7} color={s.c} />
                  <div className="text-[11px] mt-2 text-text-secondary">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] text-text-muted font-mono">
              Retention policy: 7d full-res · 30d 720p · 365d snapshots · 7y compliance archive
            </div>
          </Card>

          <Card>
            <h2 className="font-display font-semibold text-[14px] mb-3">Camera Network</h2>
            <div className="space-y-1.5 text-[12px] max-h-72 overflow-y-auto">
              {CAMERAS.map((c) => {
                const cd = c.status === "online" ? "#10B981" : c.status === "degraded" ? "#D97706" : "#6B7280";
                return (
                  <div key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-bg-surface-2 rounded">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cd }} />
                    <span className="font-mono text-[11px] text-text-muted w-20">{c.id}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-[10.5px] text-text-muted">{c.ip}</span>
                    <span className="font-mono text-[10.5px] text-text-muted">{c.fps}fps</span>
                    <span className="font-mono text-[10px] uppercase w-16 text-right" style={{ color: cd }}>{c.status}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Vital({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: `${color}22`, color }}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-text-on-dark-muted">{label}</div>
        <div className="font-display font-bold text-[18px] leading-tight text-text-on-dark">{value}</div>
        <div className="text-[10px] text-text-on-dark-muted truncate">{sub}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-text-muted tracking-wider">{label}</div>
      <div className="font-mono text-[13px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
