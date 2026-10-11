import { createFileRoute } from "@tanstack/react-router";
import { Card, Donut, PageHeader, useMounted, Skeleton } from "@/components/ui-kit";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { violationsAPI } from "@/lib/api";
import { toast } from "sonner";
import { requireAuth } from "@/lib/authGuard";

export const Route = createFileRoute("/ppe")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "PPE Compliance — SafeVision AI" }] }),
  component: PPEPage,
});

const PPE_COLORS: Record<string, string> = {
  helmet: "#E1261C", jacket: "#EA580C", gloves: "#D97706",
  mask: "#2563EB", boots: "#16A34A", harness: "#7C3AED",
};

const PPE_LABELS: Record<string, string> = {
  helmet: "Helmet", jacket: "Safety Jacket", gloves: "Gloves",
  mask: "Mask", boots: "Boots", harness: "Harness",
};

function PPEPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    { helmet: true, jacket: true, gloves: true, mask: true, boots: true, harness: true }
  );

  useEffect(() => {
    violationsAPI.getStats()
      .then(setStats)
      .catch(() => toast.error("Failed to load PPE stats"))
      .finally(() => setLoading(false));
  }, []);

  const ppeTypes = stats?.by_type ? Object.entries(stats.by_type).map(([key, val]: any) => ({
    key: key.toLowerCase().replace(/ /g, "_"),
    label: val.label || PPE_LABELS[key] || key,
    compliance: val.compliance_rate ?? 100,
    violations: val.count ?? 0,
    trend: val.trend ?? "flat",
  })) : [];

  const overallCompliance = stats?.overall_compliance ?? 0;
  const totalViolations = stats?.total_today ?? 0;
  const mostCommon = stats?.most_common ?? "—";
  const bestZone = stats?.best_zone ?? "—";

  const trendData = stats?.trend_7day ?? [];
  const deptData = stats?.by_department ?? [];

  const HEATMAP_PATTERN = stats?.hourly_pattern ?? Array(24).fill(0);

  return (
    <div>
      <PageHeader title="PPE Compliance" subtitle="Personal Protective Equipment monitoring across plant" />
      <div className="p-6 space-y-6">

        {/* Hero */}
        {loading ? (
          <Skeleton className="h-[180px]" />
        ) : (
          <div className="rounded-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
            style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-text-muted">Overall Compliance</div>
              <div className="font-display font-bold text-[64px] leading-none mt-1" style={{ color: "#111827" }}>
                {overallCompliance.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-[rgba(22,163,74,0.15)] text-[#15803D] text-[11px] font-mono">
                  {overallCompliance >= 90 ? "A" : overallCompliance >= 80 ? "B+" : "C"}
                </span>
                <span className="text-[12px] text-[#15803D] flex items-center gap-1">
                  <TrendingUp size={12} /> Live data
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <Donut value={overallCompliance} size={200} stroke={14} color="#16A34A" trackColor="#DBEAFE" />
            </div>
            <div className="space-y-2">
              <Stat label="Violations today" value={String(totalViolations)} />
              <Stat label="Most common" value={mostCommon} />
              <Stat label="Best zone" value={bestZone} />
            </div>
          </div>
        )}

        {/* PPE Type cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[140px]" />)}
          </div>
        ) : ppeTypes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ppeTypes.map((p) => (
              <Card key={p.key} className="text-center">
                <div className="flex justify-center">
                  <Donut value={p.compliance} size={70} stroke={7} color={PPE_COLORS[p.key] ?? "#6B7280"} />
                </div>
                <div className="mt-2 text-[13px] font-medium">{p.label}</div>
                <div className="text-[10.5px] text-text-muted">{p.violations} violations</div>
                <div className="text-[10.5px] mt-1 flex items-center justify-center gap-1"
                  style={{ color: p.trend === "up" ? "#16A34A" : p.trend === "down" ? "#E1261C" : "#6B7280" }}>
                  {p.trend === "up" ? <TrendingUp size={11} /> : p.trend === "down" ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {p.trend === "down" ? "worst" : p.trend === "up" ? "improving" : "stable"}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <div className="text-text-muted text-[13px]">No PPE violation data yet — system monitoring active.</div>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="font-display font-semibold text-[15px] mb-1">7-Day Compliance Trend</h2>
            {trendData.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 my-2">
                  {Object.keys(PPE_LABELS).map((key) => (
                    <label key={key} className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input type="checkbox" checked={visible[key]}
                        onChange={(e) => setVisible((v) => ({ ...v, [key]: e.target.checked }))}
                        className="accent-brand-red" />
                      <span style={{ color: PPE_COLORS[key] }}>●</span>{PPE_LABELS[key]}
                    </label>
                  ))}
                </div>
                {!mounted ? <Skeleton className="h-[260px]" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData}>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke="#6B7280" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                      <YAxis domain={[60, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                      <ReferenceLine y={90} stroke="#16A34A" strokeDasharray="4 4"
                        label={{ value: "Target", fontSize: 10, fill: "#16A34A" }} />
                      {Object.keys(PPE_LABELS).filter((k) => visible[k]).map((k) => (
                        <Line key={k} type="monotone" dataKey={k} stroke={PPE_COLORS[k]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-text-muted text-[13px]">
                No trend data yet — violations will appear here as they are detected.
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-semibold text-[15px] mb-3">Department Compliance</h2>
            {deptData.length > 0 ? (
              !mounted ? <Skeleton className="h-[260px]" /> : (
                <>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={deptData} barCategoryGap={18} barGap={4}>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                      <XAxis dataKey="dept" stroke="#6B7280" tick={{ fontSize: 11 }} />
                      <YAxis domain={[60, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)}%`, ""]}
                        contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                      <Bar dataKey="helmet" name="Helmet" fill="#E1261C" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="jacket" name="Safety Jacket" fill="#EA580C" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-2 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "#E1261C" }} /> Helmet</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "#EA580C" }} /> Safety Jacket</span>
                  </div>
                </>
              )
            ) : (
              <div className="h-[260px] flex items-center justify-center text-text-muted text-[13px]">
                No department data yet.
              </div>
            )}
          </Card>
        </div>

        {/* Heatmap */}
        <Card>
          <h2 className="font-display font-semibold text-[15px] mb-3">Violation Heatmap — 24h × PPE Type</h2>
          {ppeTypes.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid gap-1" style={{ gridTemplateColumns: "100px repeat(24, minmax(20px,1fr))", minWidth: 700 }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-[9px] font-mono text-text-muted text-center">{String(h).padStart(2, "0")}</div>
                ))}
                {ppeTypes.map((p) => (
                  <React.Fragment key={p.key}>
                    <div className="text-[11px] text-text-secondary py-1">{p.label}</div>
                    {HEATMAP_PATTERN.map((v: number, h: number) => {
                      const bg = v === 0 ? "#FFFFFF" : v <= 2 ? "#FEE2E2" : v <= 5 ? "#FCA5A5" : "#E1261C";
                      return (
                        <div key={`${p.key}-${h}`} className="aspect-square rounded-sm border border-border-light"
                          title={`${v} violations at ${String(h).padStart(2, "00")}:00`}
                          style={{ background: bg }} />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted text-[13px]">
              No violation data yet — heatmap will populate as violations are detected.
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-[10.5px] text-text-muted">
            <span>Low</span>
            <span className="flex gap-0.5">
              <span className="w-4 h-3 border border-border-light" style={{ background: "#FFFFFF" }} />
              <span className="w-4 h-3" style={{ background: "#FEE2E2" }} />
              <span className="w-4 h-3" style={{ background: "#FCA5A5" }} />
              <span className="w-4 h-3" style={{ background: "#E1261C" }} />
            </span>
            <span>High</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#DBEAFE] pb-2">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
    </div>
  );
}