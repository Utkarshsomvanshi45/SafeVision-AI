import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui-kit";
import { CAMERAS, USERS, VIOLATION_TYPES } from "@/lib/data";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { settingsAPI, BASE_URL } from "@/lib/api";
import { requireAuth } from "@/lib/authGuard";

type UserRow = { initials: string; name: string; email: string; role: string; dept: string; lastLogin: string; status: string };


export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — SafeVision AI" }] }),
  component: SettingsPage,
});

const SECTIONS = [
  { key: "general",       label: "General" },
  { key: "cameras",       label: "Camera Management" },
  { key: "ai",            label: "AI Configuration" },
  { key: "users",         label: "User Management" },
  { key: "notifications", label: "Notifications" },
  { key: "security",      label: "Security" },
  { key: "escalation",    label: "Escalation Matrix" },
  { key: "audit",         label: "Audit Logs" },
];

function SettingsPage() {
  const [section, setSection] = useState("cameras");
  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration" />
      <div className="flex gap-6 p-6">
        <aside className="w-52 shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`w-full text-left px-3 py-2 rounded text-[13px] ${section === s.key ? "bg-brand-red text-white" : "hover:bg-bg-surface-2 text-text-secondary"}`}>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          {section === "cameras" && <CameraSettings />}
          {section === "ai" && <AISettings />}
          {section === "users" && <UserSettings />}
          {section === "notifications" && <NotificationSettings />}
          {section === "escalation" && <EscalationSettings />}
          {section === "security"    && <SecuritySettings />}
          {section === "general" && <GenericSettings title="General Settings" />}
          {section === "audit" && <AuditSettings />}
        </div>
      </div>
    </div>
  );
}

function CameraSettings() {
  const [cameras, setCameras]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting]   = useState<null | "testing" | "ok" | "fail">(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    name: "", location: "", rtsp_url: "", zone: "", ip: "", fps: "24", resolution: "1080p"
  });

  const token = () => localStorage.getItem("token") || "";
  const API   = `${BASE_URL}/api/cameras/`;

  // ── Fetch cameras ────────────────────────────────────────────────────────
  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error("Failed");
      setCameras(await res.json());
    } catch { toast.error("Failed to load cameras"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  // ── Toggle camera active/paused ──────────────────────────────────────────
  const toggleCamera = async (cam: any) => {
    const newStatus = cam.status === "offline" ? "online" : "offline";
    const newAI     = newStatus === "online";
    setCameras((prev) => prev.map((c) => c.camera_id === cam.camera_id ? { ...c, status: newStatus, is_ai_active: newAI } : c));
    try {
      await fetch(`${BASE_URL}/api/cameras/${cam.camera_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: newStatus, is_ai_active: newAI }),
      });
      toast(newStatus === "online" ? `${cam.name} — monitoring resumed` : `${cam.name} — monitoring paused`, { icon: newStatus === "online" ? "✅" : "⏸" });
    } catch {
      toast.error("Failed to update camera");
      fetchCameras();
    }
  };

  // ── Delete camera ────────────────────────────────────────────────────────
  const deleteCamera = async (cam: any) => {
    if (!confirm(`Remove "${cam.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${BASE_URL}/api/cameras/${cam.camera_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setCameras((prev) => prev.filter((c) => c.camera_id !== cam.camera_id));
      toast.success(`${cam.name} removed`);
    } catch { toast.error("Failed to delete camera"); }
  };

  // ── Add camera ───────────────────────────────────────────────────────────
  const addCamera = async () => {
    if (!form.name.trim()) { toast.error("Camera name is required"); return; }
    setSaving(true);
    try {
      const camId = form.name.trim().replace(/\s+/g, "_").toUpperCase() + "_" + Date.now().toString().slice(-4);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          camera_id:   camId,
          name:        form.name.trim(),
          location:    form.location.trim() || null,
          rtsp_url:    form.rtsp_url.trim() || null,
          zone:        form.zone.trim() || null,
          fps:         parseInt(form.fps) || 24,
          resolution:  form.resolution || "1080p",
          status:      "online",
          is_ai_active: true,
        }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.detail || "Failed to add camera"); return; }
      const added = await res.json();
      setCameras((prev) => [...prev, added]);
      setForm({ name: "", location: "", rtsp_url: "", zone: "", ip: "", fps: "24", resolution: "1080p" });
      setShowForm(false);
      setTesting(null);
      toast.success(`${form.name} added successfully`);
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  // ── Test RTSP connection ─────────────────────────────────────────────────
  const testConnection = () => {
    if (!form.rtsp_url.trim() && !form.ip.trim()) { toast.error("Enter RTSP URL or IP to test"); return; }
    setTesting("testing");
    setTimeout(() => setTesting(Math.random() > 0.3 ? "ok" : "fail"), 1800);
  };

  const disabledCount = cameras.filter((c) => c.status === "offline").length;

  return (
    <div className="space-y-4">
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-border-light flex justify-between items-center">
          <div>
            <h3 className="font-display font-semibold text-[14px]">Camera Management</h3>
            {disabledCount > 0 && <p style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>⚠ {disabledCount} camera{disabledCount > 1 ? "s" : ""} temporarily disabled</p>}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 h-8 bg-brand-red text-white rounded text-[12px]">
            <Plus size={12} /> Add Camera
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div style={{ padding: 20 }}><Skeleton className="h-[200px]" /></div>
          ) : cameras.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No cameras configured. Add your first camera above.</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead style={{ background: "#f9fafb" }}>
                <tr>{["Name","Location","IP","Zone","Status","FPS","Last Online","Active",""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {cameras.map((c: any) => {
                  const isOn = c.status !== "offline";
                  return (
                    <tr key={c.camera_id} style={{ borderTop: "1px solid #f3f4f6", background: isOn ? "#fff" : "#fafafa", opacity: isOn ? 1 : 0.65 }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: isOn ? "#111827" : "#6b7280" }}>{c.name}</td>
                      <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{c.location ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono", fontSize: 11, color: "#374151" }}>{c.ip ?? "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{c.zone ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {isOn ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "IBM Plex Mono", color: c.status === "degraded" ? "#D97706" : "#16A34A" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.status === "degraded" ? "#D97706" : "#16A34A" }} />{c.status}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "IBM Plex Mono", color: "#9ca3af" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d1d5db" }} />PAUSED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono", color: "#374151" }}>{c.fps ?? 24}</td>
                      <td style={{ padding: "10px 12px", color: "#9ca3af", fontFamily: "IBM Plex Mono", fontSize: 11 }}>
                        {c.last_seen ? new Date(c.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div onClick={() => toggleCamera(c)}
                          style={{ width: 40, height: 22, borderRadius: 11, background: isOn ? "#16A34A" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                          <div style={{ position: "absolute", top: 3, left: isOn ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => deleteCamera(c)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#E1261C")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Camera Form */}
      {showForm && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-semibold text-[14px]">Add New Camera</h3>
            <button onClick={() => { setShowForm(false); setTesting(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Camera Name *", "name", "e.g. Scrap Yard Camera"],
              ["Location",      "location", "e.g. Main Scrap Yard"],
              ["RTSP URL",      "rtsp_url", "rtsp://192.168.x.x/stream"],
              ["Zone",          "zone",     "e.g. Scrap Yard Zone"],
              ["IP Address",    "ip",       "192.168.10.xx"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>FPS</label>
              <select value={form.fps} onChange={(e) => setForm((f) => ({ ...f, fps: e.target.value }))}
                style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}>
                {["5","10","15","24","25","30"].map((v) => <option key={v} value={v}>{v} fps</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Resolution</label>
              <select value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))}
                style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}>
                {["720p","1080p","4K"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={testConnection}
              style={{ padding: "0 14px", height: 36, border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12, color: "#374151", background: "#fff", cursor: "pointer" }}>
              Test Connection
            </button>
            {testing === "testing" && <span style={{ fontSize: 12, color: "#9ca3af" }}>Testing…</span>}
            {testing === "ok"      && <span style={{ fontSize: 12, color: "#16A34A" }}>✅ Connection OK</span>}
            {testing === "fail"    && <span style={{ fontSize: 12, color: "#E1261C" }}>✗ Connection failed — check RTSP URL</span>}
            <button onClick={addCamera} disabled={saving}
              style={{ marginLeft: "auto", padding: "0 20px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Adding..." : "Save Camera"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}


const DETECTION_MODULES = [
  { key: "helmet",     label: "Helmet Not Worn",         icon: "⛑", sens: 85 },
  { key: "jacket",     label: "Safety Jacket Missing",   icon: "🦺", sens: 82 },
  { key: "zone",       label: "Restricted Zone Entry",   icon: "🚧", sens: 92 },
  { key: "height",     label: "Work at Height",          icon: "📏", sens: 88 },
  { key: "equipment",  label: "Person Near Equipment",   icon: "⚙️",  sens: 80 },
  { key: "edge",       label: "Floor Edge Violation",    icon: "⚠️",  sens: 78 },
  { key: "gloves",     label: "Gloves Not Worn",         icon: "🧤", sens: 75 },
  { key: "harness",    label: "Harness Missing",         icon: "🔗", sens: 90 },
  { key: "crowd",      label: "Crowd Density Alert",     icon: "👥", sens: 70 },
  { key: "unauth",     label: "Unauthorized Entry",      icon: "🚫", sens: 92 },
  { key: "truck",      label: "Unsafe Truck Loading",    icon: "🚛", sens: 80 },
  { key: "boots",      label: "Safety Boots Missing",    icon: "👢", sens: 72 },
];

function AISettings() {
  const [dirty, setDirty]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [sens, setSens]             = useState<Record<string, number>>(
    () => Object.fromEntries(VIOLATION_TYPES.map((v) => [v.key, 80]))
  );

  // Detection modules — loaded from API
  const [masterOn, setMasterOn]           = useState(true);
  const [confirmMaster, setConfirmMaster] = useState(false);
  const [modules, setModules]             = useState<Record<string, { enabled: boolean; sens: number; violation_type?: string }>>(
    () => Object.fromEntries(DETECTION_MODULES.map((m) => [m.key, { enabled: true, sens: m.sens }]))
  );

  // ── Load from API on mount ─────────────────────────────────────────────
  const loadModules = useCallback(async () => {
    try {
      const data = await settingsAPI.getDetectionModules();
      const list: any[] = Array.isArray(data) ? data : (data.modules ?? []);
      if (list.length > 0) {
        const fromApi: Record<string, { enabled: boolean; sens: number; violation_type: string }> = {};
        list.forEach((item: any) => {
          // match by violation_type key to DETECTION_MODULES
          const matched = DETECTION_MODULES.find(
            (m) => m.key === item.violation_type || m.label.toLowerCase() === (item.violation_type ?? '').toLowerCase().replace(/_/g, ' ')
          );
          const key = matched?.key ?? item.violation_type;
          fromApi[key] = {
            enabled: item.is_enabled ?? item.enabled ?? true,
            sens:    Math.round((item.sensitivity ?? 0.8) * 100),
            violation_type: item.violation_type,
          };
        });
        setModules((prev) => {
          const merged = { ...prev };
          Object.entries(fromApi).forEach(([k, v]) => { merged[k] = v; });
          return merged;
        });
        const allOff = Object.values(fromApi).every((m) => !m.enabled);
        if (allOff) setMasterOn(false);
      }
    } catch (e) {
      console.error('Failed to load detection modules:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const disabledCount = Object.values(modules).filter((m) => !m.enabled).length;
  const enabledCount  = DETECTION_MODULES.length - disabledCount;

  // ── Toggle single module → PATCH immediately ──────────────────────────
  const toggleModule = useCallback(async (key: string) => {
    const newEnabled = !modules[key].enabled;
    setModules((prev) => ({ ...prev, [key]: { ...prev[key], enabled: newEnabled } }));
    setDirty(true);
    try {
      const violationType = modules[key].violation_type ?? key;
      await settingsAPI.toggleModule(violationType, newEnabled);
    } catch {
      // revert on fail
      setModules((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !newEnabled } }));
      toast.error('Failed to update module');
    }
  }, [modules]);

  // ── Sensitivity slider — local state, saved on "Save Configuration" ──
  const updateModuleSens = (key: string, val: number) => {
    setModules((prev) => ({ ...prev, [key]: { ...prev[key], sens: val } }));
    setDirty(true);
  };

  const handleMasterToggle = () => {
    if (masterOn) { setConfirmMaster(true); return; }
    setMasterOn(true);
    setModules((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, enabled: true }])));
    setDirty(true);
    toast.success("All detection modules resumed");
  };

  const confirmMasterOff = async () => {
    setMasterOn(false);
    setConfirmMaster(false);
    const updated = Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, { ...v, enabled: false }]));
    setModules(updated);
    setDirty(true);
    toast("All detections paused", { icon: "⚠️" });
    // PATCH all to disabled
    try {
      await Promise.all(
        DETECTION_MODULES.map((m) =>
          settingsAPI.toggleModule(modules[m.key]?.violation_type ?? m.key, false)
        )
      );
    } catch { toast.error('Some modules failed to update'); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Save sensitivity values
      await Promise.all(
        DETECTION_MODULES.map((m) => {
          const mod = modules[m.key];
          if (!mod) return Promise.resolve();
          const violationType = mod.violation_type ?? m.key;
          return settingsAPI.toggleModule(violationType, mod.enabled);
        })
      );
      setDirty(false);
      toast.success(`✓ Detection configuration saved — ${enabledCount} module${enabledCount !== 1 ? "s" : ""} active`);
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── DETECTION MODULES ── */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "DM Sans" }}>Detection Modules</h3>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>Enable or disable individual violation types without changing code. Changes take effect immediately.</p>
          </div>
          {dirty && <span style={{ fontSize: 11, color: "#D97706" }}>● Unsaved changes</span>}
        </div>

        {/* Master switch */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12, background: masterOn ? "#f0fdf4" : "#fffbeb" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>AI Detection Engine — MASTER SWITCH</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {masterOn ? `All ${enabledCount} modules active` : "⚠ ALL DETECTIONS PAUSED"}
            </div>
          </div>
          {!masterOn && (
            <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>ALL PAUSED</span>
          )}
          {/* Master toggle */}
          <div onClick={handleMasterToggle} style={{ width: 52, height: 28, borderRadius: 14, background: masterOn ? "#16A34A" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 4, left: masterOn ? 28 : 4, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
        </div>

        {/* Disabled banner */}
        {disabledCount > 0 && masterOn && (
          <div style={{ padding: "10px 20px", background: "#FFFBEB", borderBottom: "1px solid #FCD34D", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span>
            <span><strong>{disabledCount}</strong> detection module{disabledCount > 1 ? "s" : ""} currently disabled — violations of these types will not be detected.</span>
          </div>
        )}

        {/* Module rows */}
        <div>
          {loading ? (
            <div style={{ padding: 20 }}><Skeleton className="h-[320px]" /></div>
          ) : null}
          {!loading && DETECTION_MODULES.map((m, i) => {
            const mod = modules[m.key] ?? { enabled: true, sens: m.sens };
            const isOn = masterOn && mod.enabled;
            return (
              <div key={m.key} style={{
                padding: "12px 20px",
                borderBottom: i < DETECTION_MODULES.length - 1 ? "1px solid #f9fafb" : "none",
                display: "flex", alignItems: "center", gap: 12,
                background: isOn ? "#fff" : "#f9fafb",
                opacity: !masterOn ? 0.5 : 1,
                transition: "background 0.15s, opacity 0.2s",
              }}>
                {/* Icon */}
                <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{m.icon}</span>

                {/* Name */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isOn ? "#111827" : "#6b7280" }}>{m.label}</div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: 9.5, fontFamily: "IBM Plex Mono", padding: "2px 8px", borderRadius: 4,
                  background: isOn ? "#f0fdf4" : "#f3f4f6",
                  color: isOn ? "#15803D" : "#6b7280",
                  border: `1px solid ${isOn ? "#bbf7d0" : "#e5e7eb"}`,
                  flexShrink: 0, width: 64, textAlign: "center",
                }}>
                  {isOn ? "ACTIVE" : "DISABLED"}
                </span>

                {/* Sensitivity slider */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, opacity: isOn ? 1 : 0.35, pointerEvents: isOn ? "auto" : "none" }}>
                  <input type="range" min={50} max={99} value={mod.sens}
                    onChange={(e) => updateModuleSens(m.key, Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#E1261C" }} />
                  <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "#374151", width: 36, textAlign: "right" }}>{mod.sens}%</span>
                </div>

                {/* Per-module toggle */}
                <div onClick={() => masterOn && toggleModule(m.key)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: isOn ? "#16A34A" : "#d1d5db",
                    cursor: masterOn ? "pointer" : "not-allowed",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}>
                  <div style={{ position: "absolute", top: 3, left: isOn ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{enabledCount} of {DETECTION_MODULES.length} modules active</span>
          <button onClick={saveConfig} disabled={saving}
            style={{ padding: "0 20px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* ── Active Model ── */}
      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-3">Active Model</h3>
        <select className="h-9 px-3 border border-border-medium rounded text-[13px] w-full max-w-md">
          <option>YOLOv8 Safety v2.1 (Active)</option>
          <option>YOLOv8 Safety v2.0</option>
          <option>YOLOv7 Industrial</option>
        </select>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <Stat l="mAP" v="0.873" /><Stat l="Precision" v="0.891" /><Stat l="Recall" v="0.856" />
        </div>
      </Card>


      {/* Master OFF confirmation dialog */}
      {confirmMaster && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setConfirmMaster(false)}>
          <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 420, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", fontFamily: "DM Sans", marginBottom: 8 }}>⚠ Pause All Detections?</div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 }}>
              This will disable all 12 detection modules. No safety violations will be detected or alerted until you turn the master switch back on.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmMaster(false)}
                style={{ padding: "0 16px", height: 36, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmMasterOff}
                style={{ padding: "0 16px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Yes, Pause All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSettings() {
  const [users, setUsers]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showInvite, setShowInvite]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleteName, setDeleteName]   = useState("");

  const roleColor: Record<string, string> = {
    admin: "#1C2333", plant_head: "#2563EB", safety_officer: "#16A34A",
    operator: "#6B7280", security_operator: "#7C3AED", ai_engineer: "#0891B2",
    compliance_auditor: "#D97706",
  };

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const deleteUser = async (id: number, name: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || 'Failed to delete');
        return;
      }
      setUsers((arr: any[]) => arr.filter((u: any) => u.id !== id));
      toast.success(`${name} removed from system`);
    } catch { toast.error('Failed to delete user'); }
    setConfirmDelete(null);
  };

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('sv_user') || '{}'); } catch { return {}; }
  })();

  const getInitials = (name: string) => name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const formatLogin = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-border-light flex justify-between items-center">
          <div>
            <h3 className="font-display font-semibold text-[14px]">Users</h3>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{users.length} users total</p>
          </div>
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 px-3 h-8 bg-brand-red text-white rounded text-[12px]">
            <Plus size={12} /> Invite User
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div style={{ padding: 20 }}><Skeleton className="h-[200px]" /></div>
          ) : users.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No users yet</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead style={{ background: "#f9fafb" }}>
                <tr>{["", "Name", "Email", "Role", "Dept", "Last Login", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} style={{ borderTop: "1px solid #f3f4f6", background: u.email === currentUser.email ? "#fff9f9" : "#fff" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: u.email === currentUser.email ? "#E1261C" : "#6b7280", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {getInitials(u.name)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#111827" }}>
                      {u.name}
                      {u.email === currentUser.email && <span style={{ marginLeft: 6, fontSize: 9, fontFamily: "IBM Plex Mono", background: "#E1261C", color: "#fff", padding: "1px 5px", borderRadius: 3 }}>YOU</span>}
                      {u.must_change_password && <span style={{ marginLeft: 6, fontSize: 9, fontFamily: "IBM Plex Mono", background: "#FEF3C7", color: "#92400E", padding: "1px 5px", borderRadius: 3 }}>TEMP PWD</span>}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono", fontSize: 11, color: "#6b7280" }}>{u.email}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", padding: "2px 6px", borderRadius: 3, color: "#fff", background: roleColor[u.role] ?? "#6B7280" }}>{u.role}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{u.department || '—'}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{formatLogin(u.last_login)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, color: u.is_active ? "#16A34A" : "#9ca3af" }}>● {u.is_active ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {u.email !== currentUser.email && 
                        (currentUser.role === "operator" || currentUser.role === "safety_officer") && (
                        <button onClick={() => { setConfirmDelete(u.id); setDeleteName(u.name); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#E1261C")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Delete confirmation */}
      {confirmDelete !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", fontFamily: "DM Sans", marginBottom: 8 }}>Remove User?</div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 }}>
              Remove <strong style={{ color: "#111827" }}>{deleteName}</strong>? They will lose all access immediately.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: "0 16px", height: 36, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteUser(confirmDelete, deleteName)}
                style={{ padding: "0 16px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Remove User</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite drawer */}
      {showInvite && <InviteUserDrawer onClose={() => setShowInvite(false)} onSuccess={() => { setShowInvite(false); fetchUsers(); }} />}
    </>
  );
}

function InviteUserDrawer({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("operator");
  const [dept, setDept]   = useState("Safety & HSE");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const submit = async () => {
    if (!name || !email) { setError("Name and email are required"); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/auth/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, role, department: dept }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to invite'); setSaving(false); return; }
      toast.success(`${name} invited — credentials sent to ${email}`);
      onSuccess();
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-[420px] bg-bg-surface border-l border-border-light shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <h3 className="font-display font-semibold text-[15px]">Invite User</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
            A temporary password will be auto-generated and sent to the user's email. They must change it on first login.
          </p>
          <Input label="Full Name" value={name} onChange={setName} placeholder="e.g. Rahul Sharma" />
          <Input label="Email" value={email} onChange={setEmail} placeholder="name@amns.in" />
          <div>
            <label className="text-[10.5px] uppercase tracking-wider text-text-muted">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="block mt-1 w-full h-9 px-3 border border-border-medium rounded text-[13px]">
              {["operator", "safety_officer", "plant_head", "security_operator", "ai_engineer", "compliance_auditor", "admin"].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wider text-text-muted">Department</label>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="block mt-1 w-full h-9 px-3 border border-border-medium rounded text-[13px]">
              {["Safety & HSE", "Operations", "Security", "IT & Digital", "Compliance"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          {error && <div style={{ fontSize: 12, color: "#E1261C", background: "#FEF2F2", padding: "8px 12px", borderRadius: 4, border: "1px solid #FECACA" }}>{error}</div>}
        </div>
        <div className="border-t border-border-light p-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 border border-border-medium rounded text-[13px]">Cancel</button>
          <button onClick={submit} disabled={saving} className="h-9 px-4 bg-brand-red text-white rounded text-[13px] font-medium disabled:opacity-60">
            {saving ? "Sending invite..." : "Send Invite"}
          </button>
        </div>
      </aside>
    </div>
  );
}


function NotificationSettings() {
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [showAdd, setShowAdd]       = useState(false);
  const [newName, setNewName]       = useState("");
  const [newEmail, setNewEmail]     = useState("");
  const [newType, setNewType]       = useState("all");

  const getToken = () => localStorage.getItem("token") || "";
  const API = `${BASE_URL}/api/settings/recipients`;

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Failed");
      setRecipients(await res.json());
    } catch { toast.error("Failed to load recipients"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const toggle = async (id: number, current: boolean) => {
    setRecipients((r) => r.map((x: any) => x.id === id ? { ...x, is_enabled: !current } : x));
    try {
      await fetch(`${API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ is_enabled: !current }) });
    } catch { toast.error("Failed to update"); fetchRecipients(); }
  };

  const remove = async (id: number, name: string) => {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setRecipients((r: any[]) => r.filter((x: any) => x.id !== id));
      toast.success(`${name} removed`);
    } catch { toast.error("Failed to remove"); }
  };

  const addRecipient = async () => {
    if (!newName || !newEmail) return;
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ name: newName, email: newEmail, alert_type: newType }) });
      if (!res.ok) { const e = await res.json(); toast.error(e.detail || "Failed"); return; }
      const added = await res.json();
      setRecipients((r: any[]) => [...r, added]);
      setNewName(""); setNewEmail(""); setNewType("all"); setShowAdd(false);
      toast.success(`${newName} added as recipient`);
    } catch { toast.error("Network error"); }
  };

  const sendTest = async () => {
    const active = recipients.filter((r: any) => r.is_enabled);
    if (!active.length) { toast.error("No active recipients — enable at least one first"); return; }
    setSending(true);
    try {
      await fetch(`${BASE_URL}/api/settings/test-alert`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success(`✓ Test alert sent to ${active.length} recipient${active.length > 1 ? "s" : ""}`);
    } catch { toast.error("Test failed"); }
    finally { setSending(false); }
  };

  const alertTypeLabel: Record<string, string> = { all: "All violations", critical: "Critical only", high_critical: "High & Critical" };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-3">Notifications</h3>
        <div className="space-y-3 max-w-md">
          {["Email","SMS","WhatsApp"].map((c) => (
            <label key={c} className="flex items-center justify-between text-[13px] py-1 border-b border-border-light">
              <span>{c}</span><input type="checkbox" defaultChecked className="accent-brand-red" />
            </label>
          ))}
        </div>
      </Card>
      <Card padding="p-0">
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✉</span>
            <div>
              <h3 className="font-display font-semibold text-[14px]">Primary Recipients</h3>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Safety violation emails sent automatically to these recipients</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 34, background: "transparent", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12.5, color: "#374151", cursor: "pointer" }}>
            <Plus size={13} /> Add recipient
          </button>
        </div>
        <div style={{ padding: "8px 0" }}>
          {loading ? (
            <div style={{ padding: 16 }}><Skeleton className="h-[80px]" /></div>
          ) : recipients.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              No recipients yet — add one to start receiving alerts
            </div>
          ) : recipients.map((r: any) => (
            <div key={r.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f9fafb" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "#111827", fontFamily: "IBM Plex Mono" }}>
                  {r.name} — <span style={{ color: "#374151" }}>{r.email}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{alertTypeLabel[r.alert_type] ?? r.alert_type}</div>
              </div>
              <button onClick={() => remove(r.id, r.name)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E1261C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                <X size={14} />
              </button>
              <div onClick={() => toggle(r.id, r.is_enabled)}
                style={{ width: 44, height: 24, borderRadius: 12, background: r.is_enabled ? "#16A34A" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: r.is_enabled ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </div>
          ))}
        </div>
        {showAdd && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Safety Head"
                  style={{ display: "block", marginTop: 4, width: "100%", height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12.5, color: "#111827", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Email</label>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@amns.in" type="email"
                  style={{ display: "block", marginTop: 4, width: "100%", height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12.5, color: "#111827", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Alert Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12.5, color: "#111827", outline: "none", boxSizing: "border-box" }}>
                  <option value="all">All violations</option>
                  <option value="critical">Critical only</option>
                  <option value="high_critical">High & Critical</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "0 14px", height: 32, border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={addRecipient} style={{ padding: "0 14px", height: 32, background: "#E1261C", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-3">Per-Violation Type</h3>
        <table className="w-full text-[12.5px]">
          <thead className="bg-bg-surface-2 text-text-muted text-[11px] uppercase">
            <tr><th className="text-left px-3 py-2">Violation</th><th>Email</th><th>SMS</th><th>WhatsApp</th></tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {VIOLATION_TYPES.slice(0, 8).map((v) => (
              <tr key={v.key}><td className="px-3 py-2">{v.label}</td>{[1,2,3].map((i) => <td key={i} className="text-center"><input type="checkbox" defaultChecked className="accent-brand-red" /></td>)}</tr>
            ))}
          </tbody>
        </table>
        <button onClick={sendTest} disabled={sending}
          style={{ marginTop: 16, padding: "0 16px", height: 36, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#374151", background: "#fff", cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
          {sending ? "Sending..." : "Send Test Alert"}
        </button>
      </Card>
    </div>
  );
}

function SecuritySettings() {
  const [currPw, setCurrPw]   = useState("");
  const [newPw, setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew]   = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem("sv_user") || "{}"); } catch { return {}; } })();
  const mustChange = user.must_change_password;

  const changePassword = async () => {
    setError(""); setSuccess("");
    if (!currPw) { setError("Current password is required"); return; }
    if (!newPw)  { setError("New password is required"); return; }
    if (newPw.length < 6) { setError("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setError("New passwords do not match"); return; }
    if (newPw === currPw) { setError("New password must be different from current password"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to change password"); return; }
      // Update stored user — clear must_change_password
      const stored = (() => { try { return JSON.parse(localStorage.getItem("sv_user") || "{}"); } catch { return {}; } })();
      stored.must_change_password = false;
      localStorage.setItem("sv_user", JSON.stringify(stored));
      setSuccess("✅ Password changed successfully!");
      setCurrPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password updated successfully");
    } catch { setError("Network error — check backend connection"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {mustChange && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#92400E" }}>
          ⚠ <strong>Action required:</strong> You are using a temporary password. Please change it now.
        </div>
      )}

      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-1">Change Password</h3>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>Update your account password. You will remain logged in after changing.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
          {/* Current password */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Current Password</label>
            <div style={{ position: "relative", marginTop: 4 }}>
              <input
                type={showCurr ? "text" : "password"}
                value={currPw}
                onChange={(e) => setCurrPw(e.target.value)}
                placeholder="Enter current password"
                style={{ width: "100%", height: 36, padding: "0 36px 0 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              <button type="button" onClick={() => setShowCurr(!showCurr)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11 }}>
                {showCurr ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>New Password</label>
            <div style={{ position: "relative", marginTop: 4 }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 6 characters"
                style={{ width: "100%", height: 36, padding: "0 36px 0 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11 }}>
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {/* Password strength */}
            {newPw.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}>
                {[1,2,3,4].map((i) => (
                  <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: newPw.length >= i*3 ? (newPw.length < 6 ? "#E1261C" : newPw.length < 9 ? "#D97706" : "#16A34A") : "#e5e7eb" }} />
                ))}
                <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>
                  {newPw.length < 6 ? "Weak" : newPw.length < 9 ? "Medium" : "Strong"}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Re-enter new password"
              style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 12px", border: `1px solid ${confirmPw && confirmPw !== newPw ? "#E1261C" : "#d1d5db"}`, borderRadius: 4, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
            {confirmPw && confirmPw !== newPw && (
              <div style={{ fontSize: 11, color: "#E1261C", marginTop: 3 }}>Passwords do not match</div>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "8px 12px", fontSize: 12, color: "#991B1B" }}>{error}</div>
          )}
          {success && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 4, padding: "8px 12px", fontSize: 12, color: "#15803D" }}>{success}</div>
          )}

          <button
            onClick={changePassword}
            disabled={saving || !currPw || !newPw || !confirmPw || newPw !== confirmPw}
            style={{ alignSelf: "flex-start", padding: "0 20px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: (saving || !currPw || !newPw || !confirmPw || newPw !== confirmPw) ? 0.6 : 1 }}>
            {saving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-1">Account Info</h3>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>Your current account details.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 420 }}>
          {[["Name", user.name ?? "—"], ["Email", user.email ?? "—"], ["Role", user.role ?? "—"], ["Department", user.department ?? "—"]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>{label}</div>
              <div style={{ fontSize: 13, color: "#111827", marginTop: 3, fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-1">Active Sessions</h3>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>You are currently logged in on this device.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "#E1261C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💻</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>This device</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Chrome · Windows · Active now</div>
          </div>
          <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", background: "#F0FDF4", color: "#15803D", padding: "2px 8px", borderRadius: 4, border: "1px solid #BBF7D0" }}>CURRENT</span>
        </div>
      </Card>
    </div>
  );
}

function EscalationSettings() {
  return (
    <Card>
      <h3 className="font-display font-semibold text-[14px] mb-3">Escalation Matrix</h3>
      <div className="flex items-stretch gap-2 overflow-x-auto py-4">
        {[
          { t: "0 min", who: "Operator notified", color: "#2563EB" },
          { t: "5 min", who: "Safety Officer escalated", color: "#D97706" },
          { t: "15 min", who: "Plant Head escalated", color: "#E1261C" },
          { t: "Critical", who: "Plant Head + Safety Head", color: "#1C2333" },
        ].map((s, i, arr) => (
          <div key={s.t} className="flex items-center">
            <div className="border-2 rounded p-3 min-w-40" style={{ borderColor: s.color }}>
              <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: s.color }}>{s.t}</div>
              <div className="text-[12.5px] font-medium mt-1">{s.who}</div>
              <input className="mt-2 w-full h-7 px-2 border border-border-medium rounded text-[11px]" defaultValue={s.who.split(" ")[0]} />
            </div>
            {i < arr.length - 1 && <div className="w-6 h-px bg-border-medium" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditSettings() {
  return (
    <Card padding="p-0">
      <div className="px-5 py-4 border-b border-border-light"><h3 className="font-display font-semibold text-[14px]">Audit Logs</h3></div>
      <table className="w-full text-[12.5px] font-mono">
        <thead className="bg-bg-surface-2 text-text-muted text-[11px] uppercase">
          <tr>{["Time", "User", "Action", "Target"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {Array.from({ length: 12 }, (_, i) => (
            <tr key={i}><td className="px-3 py-2">{`14:${String(32-i).padStart(2,"0")}:11`}</td><td className="px-3 py-2">r.sharma</td><td className="px-3 py-2">alert.update</td><td className="px-3 py-2">ALT-20240516-00{47-i}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function GenericSettings({ title }: { title: string }) {
  const [plantName, setPlantName] = useState("Talegaon Plant");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [language, setLanguage] = useState("English (India)");
  const DEFAULT_SHIFTS = [
    { label: "Shift A", start: "06:00", end: "13:00" },
    { label: "Shift B", start: "13:00", end: "20:00" },
    { label: "Shift C", start: "20:00", end: "01:00" },
    { label: "Shift D", start: "01:00", end: "06:00" },
  ];

  const [shifts, setShifts] = useState(() => {
    const saved = localStorage.getItem("sv_shifts");
    if (saved) {
      const parsed = JSON.parse(saved);
      // If only 3 saved, add Shift D
      if (parsed.length === 3) {
        return [...parsed, { label: "Shift D", start: "00:00", end: "06:00" }];
      }
      return parsed;
    }
    return DEFAULT_SHIFTS;
  });

  const updateShift = (i: number, field: "start" | "end", val: string) => {
    setShifts((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const save = () => {
    document.title = `${plantName} — SafeVision AI`;
    localStorage.setItem("sv_plant_name", plantName);
    localStorage.setItem("sv_timezone", timezone);
    localStorage.setItem("sv_shifts", JSON.stringify(shifts));
    toast.success(`Settings saved — ${plantName} · ${shifts.length} shifts configured`);
    window.dispatchEvent(new Event("sv_settings_updated"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 className="font-display font-semibold text-[14px] mb-4">General</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
          {/* Plant Name */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Plant Name</label>
            <input value={plantName} onChange={(e) => setPlantName(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }} />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>Shown in topbar and reports</p>
          </div>

          {/* Timezone */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}>
              <option>Asia/Kolkata (IST)</option>
              <option>Asia/Mumbai (IST)</option>
              <option>UTC</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Default Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}>
              <option>English (India)</option>
              <option>Hindi</option>
              <option>Marathi</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Shift Configuration */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 className="font-display font-semibold text-[14px]">Shift Pattern</h3>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Set start & end times for all 4 shifts — changes reflect in topbar immediately after Save</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shifts.map((s: {label: string; start: string; end: string}, i: number) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 12, alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "IBM Plex Mono" }}>{s.label}</div>
              <div>
                <label style={{ fontSize: 10, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.06em" }}>Start</label>
                <input type="time" value={s.start}
                  onChange={(e) => setShifts((prev: typeof shifts) => prev.map((x: typeof s, idx: number) => idx === i ? { ...x, start: e.target.value } : x))}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.06em" }}>End</label>
                <input type="time" value={s.end}
                  onChange={(e) => setShifts((prev: typeof shifts) => prev.map((x: typeof s, idx: number) => idx === i ? { ...x, end: e.target.value } : x))}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111827", outline: "none" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff", borderRadius: 4, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9ca3af", marginBottom: 6 }}>Preview</div>
          <div style={{ fontSize: 12, fontFamily: "IBM Plex Mono", color: "#374151", display: "flex", flexWrap: "wrap", gap: 12 }}>
            {shifts.map((s: {label: string; start: string; end: string}) => (
              <span key={s.label} style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: 4 }}>
                <strong>{s.label}:</strong> {s.start}–{s.end}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <button onClick={save}
        style={{ alignSelf: "flex-start", padding: "0 24px", height: 38, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        Save Settings
      </button>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (<div className="border border-border-light rounded p-2"><div className="text-[10px] uppercase tracking-wider text-text-muted">{l}</div><div className="font-mono font-semibold text-[15px] mt-0.5">{v}</div></div>);
}

function Input({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10.5px] uppercase tracking-wider text-text-muted">{label}</label>
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="block mt-1 w-full h-9 px-3 border border-border-medium rounded text-[13px]"
      />
    </div>
  );
}