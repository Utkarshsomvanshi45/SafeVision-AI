import { createFileRoute } from "@tanstack/react-router";
import { Card, Donut, PageHeader, Skeleton, useMounted } from "@/components/ui-kit";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Legend } from "recharts";
import { useEffect, useState } from "react";
import { violationsAPI } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — SafeVision AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    violationsAPI.getStats()
      .then(setStats)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const zoneAreaData = stats?.zone_hourly ?? [];
  const shiftCompare = stats?.shift_by_zone ?? [];
  const riskTrend = stats?.risk_trend_30day ?? [];
  const riskScore = stats?.risk_score ?? 0;
  const peakOccupancy = stats?.peak_occupancy ?? 0;
  const peakZone = stats?.peak_zone ?? "—";
  const peakTime = stats?.peak_time ?? "—";
  const crowdAlerts = stats?.crowd_alerts_today ?? 0;
  const avgOccupancy = stats?.avg_zone_occupancy ?? 0;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Plant intelligence & risk insight" />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[100px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Peak Occupancy" value={peakOccupancy > 0 ? `${peakOccupancy} workers` : "No data"} sub={peakOccupancy > 0 ? `${peakZone} · ${peakTime}` : "Waiting for data"} />
            <Kpi label="Crowd Alerts" value={String(crowdAlerts)} sub="Today" />
            <Kpi label="Avg Zone Occupancy" value={avgOccupancy > 0 ? avgOccupancy.toFixed(1) : "—"} sub="workers / zone" />
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">Plant Risk Score</div>
              {riskScore > 0 ? (
                <div className="flex items-center gap-3 mt-1">
                  <Donut value={riskScore} size={60} stroke={6}
                    color={riskScore >= 85 ? "#E1261C" : riskScore >= 70 ? "#D97706" : "#16A34A"} />
                  <div>
                    <div className="font-display font-bold text-[24px]">
                      {riskScore}<span className="text-[14px] text-text-muted">/100</span>
                    </div>
                    <div className="text-[11px]" style={{ color: riskScore >= 85 ? "#E1261C" : riskScore >= 70 ? "#D97706" : "#16A34A" }}>
                      {riskScore >= 85 ? "Critical" : riskScore >= 70 ? "Moderate" : "Low"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-[12px] text-text-muted">No data yet</div>
              )}
            </Card>
          </div>
        )}

        {/* Zone Occupancy */}
        <Card>
          <h2 className="font-display font-semibold text-[15px] mb-3">Zone Occupancy Over Time</h2>
          {zoneAreaData.length > 0 ? (
            !mounted ? <Skeleton className="h-[280px]" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={zoneAreaData}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="hour" stroke="#6B7280" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" stackId="1" dataKey="blast" fill="#E1261C" stroke="#E1261C" />
                  <Area type="monotone" stackId="1" dataKey="rolling" fill="#EA580C" stroke="#EA580C" />
                  <Area type="monotone" stackId="1" dataKey="scrap" fill="#D97706" stroke="#D97706" />
                  <Area type="monotone" stackId="1" dataKey="caster" fill="#2563EB" stroke="#2563EB" />
                  <Area type="monotone" stackId="1" dataKey="gate" fill="#16A34A" stroke="#16A34A" />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="h-[280px] flex items-center justify-center text-text-muted text-[13px]">
              No occupancy data yet — data will appear as cameras detect workers.
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Heatmap */}
          <Card>
            <h2 className="font-display font-semibold text-[15px] mb-3">Crowd Density Heatmap</h2>
            {stats?.heatmap ? (
              <div className="grid grid-cols-10 gap-0.5 aspect-square">
                {stats.heatmap.map((v: number, i: number) => (
                  <div key={i} className="aspect-square rounded-sm" style={{
                    background: v < 0.3 ? "#F9FAFB" : v < 0.6 ? `rgba(217,119,6,${0.3 + v * 0.4})` : `rgba(225,38,28,${0.4 + v * 0.5})`
                  }} />
                ))}
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center text-text-muted text-[13px]">
                No density data yet.
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
              <span>Low</span>
              <div className="flex-1 h-1.5 rounded" style={{ background: "linear-gradient(90deg,#F9FAFB,#D97706,#E1261C)" }} />
              <span>High</span>
            </div>
          </Card>

          {/* Shift Comparison */}
          <Card>
            <h2 className="font-display font-semibold text-[15px] mb-3">Shift Comparison by Zone</h2>
            {shiftCompare.length > 0 ? (
              !mounted ? <Skeleton className="h-[280px]" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={shiftCompare}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                    <XAxis dataKey="zone" stroke="#6B7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="A" fill="#E1261C" />
                    <Bar dataKey="B" fill="#D97706" />
                    <Bar dataKey="C" fill="#2563EB" />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="h-[280px] flex items-center justify-center text-text-muted text-[13px]">
                No shift comparison data yet.
              </div>
            )}
          </Card>
        </div>

        {/* 30-Day Risk Trend */}
        <Card>
          <h2 className="font-display font-semibold text-[15px] mb-3">30-Day Risk Score Trend</h2>
          {riskTrend.length > 0 ? (
            !mounted ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={riskTrend}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#6B7280" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1C2333", border: "1px solid #2D3A52", color: "#F9FAFB", fontSize: 12 }} />
                  <ReferenceLine y={70} stroke="#D97706" strokeDasharray="4 4" label={{ value: "Caution 70", fontSize: 10, fill: "#D97706" }} />
                  <ReferenceLine y={85} stroke="#E1261C" strokeDasharray="4 4" label={{ value: "Critical 85", fontSize: 10, fill: "#E1261C" }} />
                  <Line type="monotone" dataKey="risk" stroke="#E1261C" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="h-[260px] flex items-center justify-center text-text-muted text-[13px]">
              No risk trend data yet — will populate over time.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-display font-bold text-[24px] mt-1">{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-0.5">{sub}</div>}
    </Card>
  );
}