import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Search, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, SeverityBadge, StatusBadge, Skeleton } from "@/components/ui-kit";
import { alertsAPI, BASE_URL } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alert Center — SafeVision AI" }] }),
  component: AlertsPage,
});

type AlertStatus = "Open" | "In Progress" | "Resolved";
type Severity    = "Critical" | "High" | "Medium" | "Low";

interface Alert {
  id: number;
  alert_id?: string;
  violation_type: string;
  camera_name: string;
  camera_id?: string;
  zone?: string;
  severity: string;
  status: string;
  confidence?: number;
  detected_at?: string;
  assigned_to?: string;
  notes?: string;
}

const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

function AlertsPage() {
  const navigate = useNavigate();

  // ── Token guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('token')) navigate({ to: '/login' });
  }, [navigate]);

  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [stats, setStats]     = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<string[]>([]);

  const [severity, setSeverity]       = useState<Severity | "all">("all");
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [search, setSearch]           = useState("");
  const [open, setOpen]               = useState<Alert | null>(null);
  const [confirmResolve, setConfirmResolve] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      const [alertData, statsData] = await Promise.all([
        alertsAPI.getAll(),
        alertsAPI.getStats(),
      ]);
      const list: Alert[] = Array.isArray(alertData) ? alertData : (alertData.alerts ?? []);
      setAlerts(list);
      setStats(statsData);
      // build camera list from data
      const cams = [...new Set(list.map((a) => a.camera_name).filter(Boolean))];
      setCameras(cams);
    } catch (e) {
      console.error('Alerts fetch failed:', e);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── WebSocket — new alerts push to top ──────────────────────────────────
  const handleWs = useCallback((msg: any) => {
    if (msg.type === 'new_alert' || msg.type === 'violation_alert') {
      fetchAlerts();
    }
  }, [fetchAlerts]);
  useWebSocket(handleWs);

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (severity !== "all" && a.severity?.toLowerCase() !== severity.toLowerCase()) return false;
      if (cameraFilter !== "all" && a.camera_name !== cameraFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (search && !`${a.id} ${a.violation_type} ${a.camera_name} ${a.zone ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [alerts, severity, cameraFilter, statusFilter, search]);

  // ── Update single alert ──────────────────────────────────────────────────
  const updateAlert = useCallback(async (id: number, patch: { status?: string; notes?: string; assigned_to?: string }) => {
    try {
      await alertsAPI.update(id, { status: patch.status ?? 'Open', notes: patch.notes });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
      if (open?.id === id) setOpen((prev) => prev ? { ...prev, ...patch } : null);
      toast.success('Alert updated');
    } catch {
      toast.error('Failed to update alert');
    }
  }, [open]);

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = ["ID","Type","Camera","Zone","Severity","Status","Confidence","Detected At","Assigned"];
    const rows = alerts.map((a) => [
      a.id,
      a.violation_type,
      a.camera_name,
      a.zone ?? '',
      a.severity,
      a.status,
      a.confidence ? `${Math.round(a.confidence * 100)}%` : '',
      a.detected_at ? new Date(a.detected_at).toLocaleString() : '',
      a.assigned_to ?? 'Unassigned',
    ].join(","));
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url;
    el.download = `safevision-alerts-${new Date().toISOString().split("T")[0]}.csv`;
    el.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exported — ${alerts.length} alerts`);
  };

  // ── Mark all resolved ────────────────────────────────────────────────────
  const markAll = async () => {
    const openAlerts = alerts.filter((a) => a.status === "Open" || a.status === "In Progress");
    try {
      await Promise.all(openAlerts.map((a) => alertsAPI.update(a.id, { status: "Resolved" })));
      setAlerts((prev) => prev.map((a) =>
        a.status === "Open" || a.status === "In Progress" ? { ...a, status: "Resolved" } : a
      ));
      setStats((s) => ({ ...s, open: 0, in_progress: 0, resolved: s.resolved + openAlerts.length }));
      toast.success(`${openAlerts.length} alert${openAlerts.length === 1 ? "" : "s"} marked resolved`);
    } catch {
      toast.error('Failed to resolve alerts');
    }
    setConfirmResolve(false);
  };

  // ── Counts from API stats ────────────────────────────────────────────────
  const counts = {
    open:     stats.open ?? 0,
    progress: stats.in_progress ?? 0,
    resolved: stats.resolved ?? 0,
    total:    stats.total ?? 0,
  };

  return (
    <div>
      <PageHeader title="Alert Center" subtitle="All safety violations across plant" right={
        <>
          <button onClick={fetchAlerts} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 h-9 border border-border-medium rounded text-[13px] hover:bg-bg-surface-2">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setConfirmResolve(true)} className="px-3 h-9 bg-brand-red text-white rounded text-[13px]">
            Mark All Resolved
          </button>
        </>
      } />

      <div className="p-6 space-y-4">
        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={statusFilter === "Open"}        onClick={() => setStatusFilter(statusFilter === "Open"        ? "all" : "Open")}        color="#E1261C">{counts.open} Open</Chip>
          <Chip active={statusFilter === "In Progress"} onClick={() => setStatusFilter(statusFilter === "In Progress" ? "all" : "In Progress")} color="#D97706">{counts.progress} In Progress</Chip>
          <Chip active={statusFilter === "Resolved"}    onClick={() => setStatusFilter(statusFilter === "Resolved"    ? "all" : "Resolved")}    color="#16A34A">{counts.resolved} Resolved</Chip>
          <Chip color="#2563EB">{counts.total} Total</Chip>
        </div>

        {/* Filters */}
        <Card padding="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="h-9 px-3 text-[13px] border border-border-medium rounded bg-bg-surface">
              <option value="all">All Severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={cameraFilter} onChange={(e) => setCameraFilter(e.target.value)} className="h-9 px-3 text-[13px] border border-border-medium rounded bg-bg-surface">
              <option value="all">All Cameras</option>
              {cameras.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="w-full h-9 pl-8 pr-3 text-[13px] border border-border-medium rounded bg-bg-surface" />
            </div>
            {(severity !== "all" || cameraFilter !== "all" || statusFilter !== "all" || search) && (
              <button onClick={() => { setSeverity("all"); setCameraFilter("all"); setStatusFilter("all"); setSearch(""); }} className="text-[12px] text-brand-red hover:underline">
                Reset Filters
              </button>
            )}
          </div>
        </Card>

        {/* Alert list */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-24 rounded-md border border-border-light"><Skeleton className="h-full" /></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-text-muted text-[13px]">
                {alerts.length === 0 ? "No alerts yet — system is monitoring ✅" : "No alerts match current filters."}
              </div>
            </Card>
          ) : filtered.map((a) => (
            <AlertCard key={a.id} alert={a} onClick={() => setOpen(a)} />
          ))}
        </div>
      </div>

      {/* Drawer */}
      {open && (
        <AlertDrawer
          alert={open}
          onClose={() => setOpen(null)}
          onUpdate={(p) => updateAlert(open.id, p)}
        />
      )}

      {/* Confirm bulk resolve modal */}
      {confirmResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmResolve(false)}>
          <div className="bg-bg-surface rounded-md w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-[15px] mb-2">Confirm bulk resolve</h3>
            <p className="text-[13px] text-text-secondary mb-4">
              Mark all {counts.open + counts.progress} open alerts as resolved? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmResolve(false)} className="h-9 px-4 border border-border-medium rounded text-[13px]">Cancel</button>
              <button onClick={markAll} className="h-9 px-4 bg-brand-red text-white rounded text-[13px] font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ children, color, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-3 h-9 rounded border text-[12px] font-medium transition ${active ? "text-white" : "hover:bg-bg-surface-2"}`}
      style={{ background: active ? color : "transparent", borderColor: color, color: active ? "white" : color }}>
      {children}
    </button>
  );
}

// ── AlertCard ─────────────────────────────────────────────────────────────────
function AlertCard({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const sevLower = alert.severity?.toLowerCase() ?? '';
  const accent   = sevLower === "critical" || sevLower === "high" ? "#E1261C" : sevLower === "medium" ? "#D97706" : "#16A34A";
  const conf     = alert.confidence ? Math.round(alert.confidence * 100) : null;
  const ts       = alert.detected_at ? new Date(alert.detected_at).toLocaleTimeString() : '—';

  return (
    <div onClick={onClick} className="relative bg-bg-surface border border-border-light rounded-md p-4 flex gap-4 cursor-pointer hover:shadow-md transition group">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md" style={{ background: accent }} />
      <div className="w-20 h-16 bg-[#0A0F1A] rounded relative overflow-hidden shrink-0">
        <FauxThumb />
        <div className="absolute" style={{ left: "30%", top: "20%", width: "40%", height: "60%", border: `2px solid ${accent}` }} />
        {conf !== null && (
          <div className="absolute bottom-1 left-1 text-[8px] font-mono px-1 rounded text-white" style={{ background: accent }}>{conf}%</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
          #{alert.id}
        </div>
        <div className="font-display font-semibold text-[14px] mt-0.5">{alert.violation_type}</div>
        <div className="text-[12px] text-text-muted mt-0.5">
          {alert.camera_name}{alert.zone ? ` · ${alert.zone}` : ''} · <span className="font-mono">{ts}</span>
        </div>
        {conf !== null && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="font-mono text-[11px] text-text-secondary">AI Conf: {conf}%</span>
            <div className="w-12 h-1 bg-border-light rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${conf}%`, background: accent }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <StatusBadge status={alert.status} />
        <SeverityBadge severity={alert.severity} />
        <span className="text-[10.5px] text-text-muted">{alert.assigned_to ?? 'Unassigned'}</span>
        <button className="text-[11px] text-brand-red font-medium opacity-0 group-hover:opacity-100">View Details →</button>
      </div>
    </div>
  );
}

function FauxThumb() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#16222F] to-[#0A0F1A]">
      <div className="absolute left-1/2 top-1/4 w-2 h-6 bg-black/40 rounded-full -translate-x-1/2" />
      <div className="absolute left-1/2 top-[40%] w-4 h-3 bg-black/30 rounded-sm -translate-x-1/2" />
    </div>
  );
}

// ── AlertDrawer ───────────────────────────────────────────────────────────────
function AlertDrawer({ alert, onClose, onUpdate }: { alert: Alert; onClose: () => void; onUpdate: (p: any) => void }) {
  const sevLower = alert.severity?.toLowerCase() ?? '';
  const accent   = sevLower === "critical" || sevLower === "high" ? "#E1261C" : "#D97706";
  const conf     = alert.confidence ? Math.round(alert.confidence * 100) : null;
  const ts       = alert.detected_at ? new Date(alert.detected_at).toLocaleString() : '—';

  const [localStatus, setLocalStatus]   = useState(alert.status);
  const [localAssign, setLocalAssign]   = useState(alert.assigned_to ?? 'Unassigned');
  const [assignOptions, setAssignOptions] = useState<string[]>(["Unassigned"]);

  useEffect(() => {
    // Fetch real users from backend
    fetch(`${BASE_URL}/api/auth/users`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` }
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const users = Array.isArray(data) ? data : (data.users ?? []);
        const names = users.map((u: any) => u.name || u.username || u.email);
        setAssignOptions(["Unassigned", ...names]);
      })
      .catch(() => {
        // fallback — just show Unassigned
        setAssignOptions(["Unassigned"]);
      });
  }, []);
  const [localNotes, setLocalNotes]     = useState(alert.notes ?? '');
  const [saving, setSaving]             = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate({ status: localStatus, assigned_to: localAssign, notes: localNotes });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-[480px] bg-bg-surface border-l border-border-light shadow-2xl overflow-y-auto slide-down-fade">
        <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
          <span className="font-mono text-[12px] text-text-muted">#{alert.id}</span>
          <SeverityBadge severity={alert.severity} />
          <StatusBadge status={alert.status} />
          <button onClick={onClose} className="ml-auto p-1 hover:bg-bg-surface-2 rounded"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Faux snapshot */}
          <div className="bg-[#0A0F1A] aspect-video rounded relative overflow-hidden">
            <FauxThumb />
            <div className="absolute" style={{ left: "32%", top: "18%", width: "36%", height: "65%", border: `2px solid ${accent}`, boxShadow: `0 0 12px ${accent}55` }}>
              <div className="absolute -top-5 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded text-white" style={{ background: accent }}>
                ⚠ {alert.violation_type}{conf !== null ? ` · ${conf}%` : ''}
              </div>
            </div>
            <div className="absolute bottom-2 left-2 text-white/80 font-mono text-[10px]">{ts}</div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 h-9 border border-border-medium rounded text-[12px] hover:bg-bg-surface-2">Download</button>
            <button className="flex-1 h-9 border border-border-medium rounded text-[12px] hover:bg-bg-surface-2">Share</button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <Meta label="Violation Type"   value={alert.violation_type} />
            <Meta label="AI Model"         value="YOLOv11m Safety" />
            {conf !== null && <Meta label="Confidence" value={`${conf}%`} mono />}
            <Meta label="Camera"           value={alert.camera_name} />
            <Meta label="Zone"             value={alert.zone ?? '—'} />
            <Meta label="Detected at"      value={ts} mono />
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-text-muted mb-2">Timeline</div>
            <div className="flex items-center justify-between">
              {["Detected", "Created", "Assigned", "Resolved"].map((s, i) => {
                const reached = (alert.status === "Open" && i < 2) || (alert.status === "In Progress" && i < 3) || alert.status === "Resolved";
                return (
                  <div key={s} className="flex flex-col items-center flex-1 relative">
                    <div className={`w-3 h-3 rounded-full ${reached ? "bg-state-info" : "bg-border-medium"}`} />
                    <div className="text-[10px] mt-1 text-text-muted">{s}</div>
                    {i < 3 && <div className={`absolute top-1.5 left-1/2 right-0 h-px ${reached ? "bg-state-info" : "bg-border-medium"}`} style={{ width: "100%" }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit panel */}
          <div className="space-y-2 border-t border-border-light pt-4">
            <label className="block text-[11px] uppercase tracking-widest text-text-muted">Status</label>
            <select value={localStatus} onChange={(e) => setLocalStatus(e.target.value)} className="w-full h-9 px-3 border border-border-medium rounded text-[13px] bg-bg-surface">
              {["Open", "In Progress", "Resolved"].map((s) => <option key={s}>{s}</option>)}
            </select>

            <label className="block text-[11px] uppercase tracking-widest text-text-muted mt-2">Assign To</label>
            <select value={localAssign} onChange={(e) => setLocalAssign(e.target.value)} className="w-full h-9 px-3 border border-border-medium rounded text-[13px] bg-bg-surface">
              {assignOptions.map((s) => <option key={s}>{s}</option>)}
            </select>

            <label className="block text-[11px] uppercase tracking-widest text-text-muted mt-2">Notes</label>
            <textarea rows={3} value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} placeholder="Add notes..." className="w-full p-2 border border-border-medium rounded text-[13px] bg-bg-surface" />

            <button onClick={save} disabled={saving} className="w-full h-10 bg-brand-red text-white rounded text-[13px] font-medium disabled:opacity-60">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`text-[12.5px] mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
