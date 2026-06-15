interface Props {
  collapsed?: boolean;
  variant?: "dark" | "light";
  size?: number;
}

export function SafeVisionLogo({ collapsed = false, variant = "dark", size = 32 }: Props) {
  const safeColor = variant === "dark" ? "#FFFFFF" : "#0A1628";
  const visionColor = "#0D9E75";
  return (
    <div className="flex items-center gap-2.5">
      <ShieldCamMark size={size} />
      {!collapsed && (
        <div className="flex items-baseline gap-1 leading-none font-display font-bold tracking-[0.04em]">
          <span style={{ color: safeColor, fontSize: 16 }}>SAFE</span>
          <span style={{ color: visionColor, fontSize: 16 }}>VISION</span>
          <span
            className="ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
            style={{ background: variant === "dark" ? "#FFFFFF" : "#0A1628", color: variant === "dark" ? "#0A1628" : "#FFFFFF" }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}

function ShieldCamMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circuit traces left */}
      <g stroke="#0D9E75" strokeWidth="0.7" opacity="0.7">
        <line x1="1" y1="14" x2="6" y2="14" />
        <line x1="1" y1="20" x2="6" y2="20" />
        <line x1="1" y1="26" x2="6" y2="26" />
        <circle cx="1" cy="14" r="0.9" fill="#0D9E75" />
        <circle cx="1" cy="20" r="0.9" fill="#0D9E75" />
        <circle cx="1" cy="26" r="0.9" fill="#0D9E75" />
      </g>
      {/* Circuit traces right */}
      <g stroke="#0D9E75" strokeWidth="0.7" opacity="0.7">
        <line x1="34" y1="14" x2="39" y2="14" />
        <line x1="34" y1="20" x2="39" y2="20" />
        <line x1="34" y1="26" x2="39" y2="26" />
        <circle cx="39" cy="14" r="0.9" fill="#0D9E75" />
        <circle cx="39" cy="20" r="0.9" fill="#0D9E75" />
        <circle cx="39" cy="26" r="0.9" fill="#0D9E75" />
      </g>
      {/* Shield left half */}
      <path d="M20 6 L7 9 V22 C7 28 13 33 20 35 Z" fill="#0A1628" />
      {/* Shield right half */}
      <path d="M20 6 L33 9 V22 C33 28 27 33 20 35 Z" fill="#0D9E75" />
      {/* Hard hat */}
      <path d="M11 11 Q20 4 29 11 L29 12.5 L11 12.5 Z" fill="#F59E0B" />
      <rect x="19" y="6" width="2" height="3" fill="#F59E0B" />
      {/* Camera lens */}
      <circle cx="20" cy="22" r="6.5" fill="#0A1628" stroke="#FFFFFF" strokeWidth="0.6" />
      <circle cx="20" cy="22" r="4.5" fill="none" stroke="#2563EB" strokeWidth="0.8" />
      <circle cx="20" cy="22" r="2.6" fill="#2563EB" />
      <circle cx="20" cy="22" r="1.1" fill="#0A1628" />
      <circle cx="18.7" cy="20.7" r="0.7" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}
