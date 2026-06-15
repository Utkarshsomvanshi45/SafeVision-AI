import * as React from "react";

export function PageHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode; }) {
  return (
    <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}
      className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="font-display text-[20px] font-semibold leading-tight" style={{ color: "#111827" }}>{title}</h1>
        {subtitle && <p className="text-[13px] mt-0.5" style={{ color: "#6b7280" }}>{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Card({
  children, className = "", accent, padding = "p-5",
}: { children: React.ReactNode; className?: string; accent?: string; padding?: string; }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      className={`relative ${padding} ${className}`}>
      {accent && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md" style={{ background: accent }} />
      )}
      {children}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: "bg-[rgba(225,38,28,0.1)] text-[#E1261C] border-[rgba(225,38,28,0.3)]",
    High: "bg-[rgba(234,88,12,0.1)] text-[#EA580C] border-[rgba(234,88,12,0.3)]",
    Medium: "bg-[rgba(217,119,6,0.1)] text-[#D97706] border-[rgba(217,119,6,0.3)]",
    Low: "bg-[rgba(22,163,74,0.1)] text-[#16A34A] border-[rgba(22,163,74,0.3)]",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase border ${map[severity]}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const norm = status === "Open" ? "NEW" : status === "In Progress" ? "ACKNOWLEDGED" : status.toUpperCase();
  const map: Record<string, { bg: string; text: string; border?: string; pulse?: boolean }> = {
    NEW:              { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
    ACKNOWLEDGED:     { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
    "UNDER REVIEW":   { bg: "#FAF5FF", text: "#7E22CE", border: "#E9D5FF" },
    ESCALATED:        { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74", pulse: true },
    RESOLVED:         { bg: "#16A34A", text: "#FFFFFF", border: "#16A34A" },
    "FALSE POSITIVE": { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
    CLOSED:           { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
  };
  const s = map[norm] ?? map.NEW;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${s.pulse ? "esc-pulse" : ""}`}
      style={{ background: s.bg, color: s.text, borderColor: s.border ?? s.bg }}>
      {norm}
    </span>
  );
}

export function Donut({
  value, size = 60, stroke = 6, color = "#16A34A", trackColor = "#E5E7EB", showLabel = true,
}: { value: number; size?: number; stroke?: number; color?: string; trackColor?: string; showLabel?: boolean; }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1200ms ease" }} />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center font-display font-semibold"
          style={{ fontSize: size / 4, color: "#111827" }}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, color = "#E1261C" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.map((v, i) => (
        <div key={i} className="w-1 rounded-sm"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function useMounted(delay = 600): boolean {
  const [m, setM] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setM(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return m;
}
