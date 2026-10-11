import React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MonitorPlay, BellRing, ShieldCheck, MapPin,
  BarChart3, Search, FileBarChart, Settings2, Menu, Bell,
  ChevronLeft, Users, CheckSquare, Mail, LogOut,
} from "lucide-react";
import { SafeVisionLogo } from "@/assets/SafeVisionLogo";
import { useSentinelStore } from "@/lib/store";
import { OPERATORS_ONLINE } from "@/lib/data";
import { useEffect, useState } from "react";
import { BASE_URL } from "@/lib/api";


// ── Helper: get logged-in user from localStorage ────────────────────────────
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('sv_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getInitials(name: string) {
  if (!name) return 'U';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const navTop = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitor", icon: MonitorPlay, live: true },
];
const navSafety = [
  { to: "/compliance", label: "Compliance Review", icon: CheckSquare, pending: true },
  { to: "/alerts", label: "Alert Center", icon: BellRing, badge: true },
  { to: "/ppe", label: "PPE Compliance", icon: ShieldCheck },
  { to: "/zones", label: "Zone Control", icon: MapPin },
];
const navIntel = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/incidents", label: "Investigations", icon: Search },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];
const navSys = [
  { to: "/settings", label: "Settings", icon: Settings2 },
];

function NavItem({ to, label, icon: Icon, collapsed, live, badgeCount }: {
  to: string; label: string; icon: any; collapsed: boolean; live?: boolean; badgeCount?: number;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = path === to || (to !== "/" && path.startsWith(to));
  return (
    <Link to={to} title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10, height: 40,
        padding: collapsed ? "0 12px" : "0 12px",
        borderRadius: 6, fontSize: 13, textDecoration: "none",
        transition: "background 0.15s",
        borderLeft: active ? "2px solid #E1261C" : "2px solid transparent",
        background: active ? "rgba(225,38,28,0.08)" : "transparent",
        color: active ? "#E1261C" : "#374151",
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f3f4f6"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <Icon size={18} style={{ color: active ? "#E1261C" : "#6b7280", flexShrink: 0 }} />
      {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
      {!collapsed && live && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "IBM Plex Mono", color: "#E1261C" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E1261C", display: "inline-block" }} className="animate-pulse" /> LIVE
        </span>
      )}
      {!collapsed && badgeCount !== undefined && badgeCount > 0 && (
        <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", background: "#E1261C", color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{badgeCount}</span>
      )}
    </Link>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div style={{ margin: "12px 12px", borderTop: "1px solid #e5e7eb" }} />;
  return <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginTop: 24, marginBottom: 4, padding: "0 12px" }}>{label}</div>;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, alerts } = useSentinelStore();
  const openCount = alerts.filter((a) => a.status === "Open").length;
  const collapsed = sidebarCollapsed;

  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      background: "#ffffff",
      borderRight: "1px solid #e5e7eb",
      width: collapsed ? 64 : 240,
      transition: "width 0.2s",
      flexShrink: 0,
    }} className="hidden md:flex">
      {/* Logo row */}
      <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid #e5e7eb" }}>
        <SafeVisionLogo collapsed={collapsed} variant="light" />
        <button onClick={toggleSidebar}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navTop.map((n) => <NavItem key={n.to} {...n} collapsed={collapsed} />)}
        <SectionLabel label="Safety Operations" collapsed={collapsed} />
        {navSafety.map((n) => (
          <NavItem key={n.to} {...n} collapsed={collapsed}
            badgeCount={(n as any).badge ? openCount : undefined} />
        ))}
        <SectionLabel label="Intelligence" collapsed={collapsed} />
        {navIntel.map((n) => <NavItem key={n.to} {...n} collapsed={collapsed} />)}
        <SectionLabel label="System" collapsed={collapsed} />
        {navSys.map((n) => <NavItem key={n.to} {...n} collapsed={collapsed} />)}
      </nav>

      {/* User row with logout */}
      <SidebarUserRow collapsed={collapsed} />
    </aside>
  );
}

export function Topbar() {
  const { alerts, toggleSidebar, camerasOnline, camerasTotal } = useSentinelStore();
  const [opsOnline, setOpsOnline] = useState(0);

  useEffect(() => {
    fetch(`${BASE_URL}/api/auth/users`, {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""}` }
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const users = Array.isArray(data) ? data : (data.users ?? []);
        setOpsOnline(users.filter((u: any) => u.is_active).length);
      })
      .catch(() => setOpsOnline(0));
  }, []);
  const openCount = alerts.filter((a) => a.status === "Open").length;
  const criticalCount = alerts.filter((a) => a.severity === "Critical" && a.status !== "Resolved").length;
  const path = useRouterState({ select: (r) => r.location.pathname });
  const crumb = path === "/" ? "Command Center" : path.replace("/", "").replace(/-/g, " ");

  const [time, setTime]           = useState<string>("");
  const [shift, setShift]         = useState<{ name: string; range: string; progress: number }>({ name: "A", range: "06:00–14:00", progress: 0 });
  const [plantName, setPlantName] = useState<string>("Talegaon");

  // Helper: parse "06:00" → decimal hours (6.0)
  const toHrs = (t: string) => { const [h, m] = t.split(":").map(Number); return h + m / 60; };

  const computeShift = () => {
    if (typeof window === 'undefined') return;
    const d = new Date();
    setTime(d.toLocaleTimeString("en-IN", { hour12: false }));
    const h = d.getHours() + d.getMinutes() / 60;

    // Load saved shifts or fall back to defaults
    const saved = localStorage.getItem("sv_shifts");
    const shifts: { label: string; start: string; end: string }[] = saved
      ? JSON.parse(saved)
      : [
          { label: "Shift A", start: "06:00", end: "14:00" },
          { label: "Shift B", start: "14:00", end: "22:00" },
          { label: "Shift C", start: "22:00", end: "06:00" },
        ];

    let matched = shifts[shifts.length - 1]; // default last shift
    for (const s of shifts) {
      const st = toHrs(s.start);
      const en = toHrs(s.end);
      if (en > st) {
        // normal shift e.g. 06–14
        if (h >= st && h < en) { matched = s; break; }
      } else {
        // overnight shift e.g. 22–06
        if (h >= st || h < en) { matched = s; break; }
      }
    }

    const st = toHrs(matched.start);
    const en = toHrs(matched.end);
    const duration = en > st ? en - st : 24 - st + en;
    const elapsed = en > st
      ? Math.max(0, h - st)
      : h >= st ? h - st : 24 - st + h;
    const pct = Math.max(0, Math.min(100, (elapsed / duration) * 100));
    const shortName = matched.label.replace("Shift ", "");
    setShift({ name: shortName, range: `${matched.start}–${matched.end}`, progress: pct });
  };

  useEffect(() => {
    // Load plant name from localStorage (safe — runs only in browser)
    setPlantName(localStorage.getItem("sv_plant_name") || "Talegaon");
    computeShift();
    const i = setInterval(computeShift, 1000);
    // Listen for settings save event
    const onSettingsUpdate = () => {
      setPlantName(localStorage.getItem("sv_plant_name") || "Talegaon");
      computeShift();
    };
    window.addEventListener("sv_settings_updated", onSettingsUpdate);
    return () => { clearInterval(i); window.removeEventListener("sv_settings_updated", onSettingsUpdate); };
  }, []);

  return (
    <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
        {/* Mobile menu */}
        <button onClick={toggleSidebar}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 8, display: "flex", alignItems: "center" }}
          className="md:hidden">
          <Menu size={18} />
        </button>

        {/* Plant info */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: "#E1261C" }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>AM/NS India — {plantName}</div>
            <div style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "#9ca3af" }}>Sector A-7 · IST · {crumb}</div>
          </div>
        </div>

        {/* Status pills */}
        <div className="hidden xl:flex" style={{ alignItems: "center", gap: 8, margin: "0 auto" }}>
          <Pill color="green" dot>{camerasOnline}/{camerasTotal || "?"} Online Cameras</Pill>
          {openCount > 0 && (
            <Pill color="red" dot pulse>{criticalCount > 0 ? `${criticalCount} CRITICAL` : `${openCount} Alerts`}</Pill>
          )}
          <Pill color="amber">Shift {shift.name} · {shift.range}</Pill>
          {opsOnline > 0 && <Pill color="blue"><Users size={10} style={{ marginRight: 4 }} />{opsOnline} ops online</Pill>}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Time + shift */}
          <div className="hidden md:flex" style={{ flexDirection: "column", alignItems: "flex-end", lineHeight: 1.3 }}>
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12.5, color: "#111827", fontWeight: 600 }}>{time}</span>
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 9.5, color: "#9ca3af" }}>Shift {shift.name} · {Math.round(shift.progress)}%</span>
          </div>

          <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

          {/* Email badge */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Mail size={12} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "#10B981" }}>EMAIL ON</span>
          </div>

          {/* Bell */}
          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 8, display: "flex", alignItems: "center" }}>
            <Bell size={18} />
            {openCount > 0 && (
              <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "#E1261C", color: "#fff", fontSize: 9, fontFamily: "IBM Plex Mono", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{openCount}</span>
            )}
          </button>

          {/* Avatar with dropdown */}
          <TopbarUserMenu />
        </div>
      </div>
    </header>
  );
}

function Pill({ children, color, dot, pulse }: {
  children: React.ReactNode; color: "green" | "red" | "amber" | "blue"; dot?: boolean; pulse?: boolean;
}) {
  const map = {
    green: { bg: "rgba(5,150,105,0.08)", text: "#065f46", border: "rgba(5,150,105,0.25)" },
    red:   { bg: "rgba(225,38,28,0.08)", text: "#991b1b", border: "rgba(225,38,28,0.3)" },
    amber: { bg: "rgba(217,119,6,0.08)", text: "#92400e", border: "rgba(217,119,6,0.25)" },
    blue:  { bg: "rgba(37,99,235,0.08)", text: "#1e40af", border: "rgba(37,99,235,0.25)" },
  }[color];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, border: `1px solid ${map.border}`, background: map.bg, color: map.text }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: map.text, flexShrink: 0 }} className={pulse ? "animate-pulse" : ""} />}
      {children}
    </div>
  );
}

// ── Sidebar bottom user row ───────────────────────────────────────────────────
function SidebarUserRow({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const name     = user?.name || user?.username || 'User';
  const role     = user?.role || 'Operator';
  const initials = getInitials(name);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sv_user');
    navigate({ to: '/login' });
  };

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E1261C", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {initials}
      </div>
      {!collapsed && (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "capitalize" }}>{role}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E1261C")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >
            <LogOut size={14} />
          </button>
        </>
      )}
      {collapsed && (
        <button onClick={logout} title="Logout"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, display: "flex" }}>
          <LogOut size={13} />
        </button>
      )}
    </div>
  );
}

// ── Topbar user avatar + dropdown ─────────────────────────────────────────────
function TopbarUserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const user     = getStoredUser();
  const name     = user?.name || user?.username || 'User';
  const role     = user?.role || 'operator';
  const email    = user?.email || user?.sub || '';
  const initials = getInitials(name);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sv_user');
    navigate({ to: '/login' });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: 32, height: 32, borderRadius: "50%", background: "#E1261C", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
      >
        {initials}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{ position: "absolute", right: 0, top: 40, width: 220, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}>
            {/* User info */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E1261C", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                  <div style={{ fontSize: 10, color: "#E1261C", fontFamily: "IBM Plex Mono", textTransform: "capitalize", marginTop: 1 }}>{role}</div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px 0" }}>
              <MenuItem icon="⚙️" label="Settings" onClick={() => { navigate({ to: '/settings' }); setOpen(false); }} />
              <MenuItem icon="👤" label="My Profile" onClick={() => setOpen(false)} />
              <div style={{ margin: "6px 0", borderTop: "1px solid #f3f4f6" }} />
              <MenuItem icon={<LogOut size={14} />} label="Logout" onClick={logout} danger />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", fontSize: 13, background: "none", border: "none", cursor: "pointer", color: danger ? "#E1261C" : "#374151" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#FEF2F2" : "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </button>
  );
}
