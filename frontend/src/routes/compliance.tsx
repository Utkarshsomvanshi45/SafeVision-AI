import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X, Filter, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { Card, PageHeader, Skeleton } from "@/components/ui-kit";
import { formatPct } from "@/lib/format";
import { toast } from "sonner";
import { complianceAPI, BASE_URL } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { requireAuth } from "@/lib/authGuard";

export const Route = createFileRoute("/compliance")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Compliance Review — SafeVision AI" }] }),
  component: CompliancePage,
});

const VIOLATION_TYPES = [
  "All Violations","Work At Height","Safety Jacket Missing","Helmet Not Worn",
  "Person Near Equipment","Crowd Density Alert","Restricted Zone Entry",
  "Floor Edge Violation","Gloves Not Worn","Unauthorized Entry",
];

interface Snap {
  id: number;
  snapshot_code?: string;
  violation_type: string;
  camera_name: string;
  zone?: string;
  captured_at?: string;
  detected_at?: string;
  confidence?: number;
  severity?: string;
  status: string;
  snapshot_path?: string;
  snapshot_filename?: string;
  snapshot_url?: string;
}

type FilterStatus = "pending" | "accepted" | "rejected" | "ALL";

function getImgUrl(snap: Snap): string | null {
  if (snap.snapshot_url) return snap.snapshot_url;
  // try snapshot_filename first
  if (snap.snapshot_filename) return `${BASE_URL}/snapshots/${snap.snapshot_filename}`;
  // extract filename from snapshot_path
  if (snap.snapshot_path) {
    const parts = snap.snapshot_path.replace(/\\/g, '/').split('/');
    const fname = parts[parts.length - 1];
    if (fname) return `${BASE_URL}/snapshots/${fname}`;
  }
  return null;
}

function CompliancePage() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem('token')) navigate({ to: '/login' });
  }, [navigate]);

  const [snaps, setSnaps]     = useState<Snap[]>([]);
  const [stats, setStats]     = useState({ pending: 0, accepted: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<string[]>([]);

  const [filter, setFilter]                     = useState<FilterStatus>("ALL");
  const [selectedDate, setSelectedDate]         = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCamera, setSelectedCamera]     = useState("All Cameras");
  const [selectedViolation, setSelectedViolation] = useState("All Violations");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapData, statsData] = await Promise.all([
        complianceAPI.getAll(),
        complianceAPI.getStats(),
      ]);
      const list: Snap[] = Array.isArray(snapData) ? snapData : (snapData.snapshots ?? snapData.items ?? []);
      setSnaps(list);
      setStats(statsData);
      const cams = [...new Set(list.map((s) => s.camera_name).filter(Boolean))];
      setCameras(cams as string[]);
    } catch (e) {
      console.error('Compliance fetch failed:', e);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const handleWs = useCallback((msg: any) => {
    if (['new_snapshot','new_compliance','violation_alert'].includes(msg.type)) fetchData();
  }, [fetchData]);
  useWebSocket(handleWs);

  // ── Accept / Reject / Delete ──────────────────────────────────────────────
  const updateSnap = useCallback(async (id: number, action: 'accept' | 'reject' | 'pending') => {
    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'pending';
    const prevSnaps = snaps;
    setSnaps((arr) => arr.map((s) => s.id === id ? { ...s, status: newStatus } : s));
    try {
      await complianceAPI.update(id, { status: newStatus as any });
      toast.success(action === 'accept' ? 'Snapshot accepted' : action === 'reject' ? 'Snapshot rejected' : 'Reverted to pending');
      fetchData(); // refresh stats
    } catch {
      setSnaps(prevSnaps);
      toast.error('Failed to update snapshot');
    }
  }, [snaps, fetchData]);

  const deleteSnap = useCallback(async (id: number) => {
    setSnaps((arr) => arr.filter((s) => s.id !== id));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE_URL}/api/compliance/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Snapshot deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete snapshot');
      fetchData();
    }
  }, [fetchData]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const visible = useMemo(() => snaps.filter((s) => {
    if (filter !== "ALL" && s.status !== filter) return false;
    if (selectedCamera !== "All Cameras" && s.camera_name !== selectedCamera) return false;
    if (selectedViolation !== "All Violations" && s.violation_type !== selectedViolation) return false;
    // date filter — match captured_at or detected_at
    const ts = s.captured_at || s.detected_at;
    if (selectedDate && ts) {
      const snapDate = new Date(ts).toISOString().split("T")[0];
      if (snapDate !== selectedDate) return false;
    }
    return true;
  }), [snaps, filter, selectedCamera, selectedViolation, selectedDate]);

  const displayDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Select Date";

  return (
    <div>
      <PageHeader
        title="Compliance Review"
        subtitle="Safety violation snapshot review and classification"
        right={
          <>
            <button onClick={fetchData} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <RefreshCw size={14} /> Refresh
            </button>

            {/* Date picker */}
            <div style={{ position: "relative" }}>
              <button
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 36, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#374151", background: "#fff", cursor: "pointer" }}
                onClick={() => (document.getElementById("compliance-date") as HTMLInputElement)?.showPicker?.()}>
                <Calendar size={13} /> {displayDate}
              </button>
              <input
                id="compliance-date" type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ position: "absolute", opacity: 0, width: 1, height: 1, top: 0, left: 0, pointerEvents: "none" }}
              />
            </div>

            {/* Camera filter */}
            <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}
              style={{ height: 36, padding: "0 12px", fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6, color: "#374151", background: "#fff", cursor: "pointer" }}>
              <option>All Cameras</option>
              {cameras.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Violation type filter */}
            <select value={selectedViolation} onChange={(e) => setSelectedViolation(e.target.value)}
              style={{ height: 36, padding: "0 12px", fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6, color: "#374151", background: "#fff", cursor: "pointer" }}>
              {VIOLATION_TYPES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Active filter indicator */}
        {(selectedCamera !== "All Cameras" || selectedViolation !== "All Violations") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, fontSize: 12, color: "#1D4ED8" }}>
            <Filter size={13} />
            Filtered by:{" "}
            {selectedCamera !== "All Cameras" && <strong>{selectedCamera}</strong>}
            {selectedCamera !== "All Cameras" && selectedViolation !== "All Violations" && " · "}
            {selectedViolation !== "All Violations" && <strong>{selectedViolation}</strong>}
            <button onClick={() => { setSelectedCamera("All Cameras"); setSelectedViolation("All Violations"); }}
              style={{ marginLeft: "auto", color: "#E1261C", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}>
              Clear filters
            </button>
          </div>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === "pending"}  onClick={() => setFilter(filter === "pending"  ? "ALL" : "pending")}  color="#D97706">{stats.pending} Pending</Chip>
          <Chip active={filter === "accepted"} onClick={() => setFilter(filter === "accepted" ? "ALL" : "accepted")} color="#16A34A">{stats.accepted} Accepted</Chip>
          <Chip active={filter === "rejected"} onClick={() => setFilter(filter === "rejected" ? "ALL" : "rejected")} color="#6B7280">{stats.rejected} Rejected</Chip>
          <Chip active={filter === "ALL"}      onClick={() => setFilter("ALL")}                                       color="#2563EB">{stats.total} Total Today</Chip>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => <div key={i} style={{ height: 300, borderRadius: 6, border: "1px solid #e5e7eb" }}><Skeleton className="h-full" /></div>)}
          </div>
        ) : visible.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-text-muted text-[13px]">
              {snaps.length === 0 ? "No snapshots yet — AI is monitoring ✅" : "No snapshots match current filters."}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((s) => (
              <SnapCard key={s.id} snap={s}
                onAccept={() => updateSnap(s.id, 'accept')}
                onReject={() => updateSnap(s.id, 'reject')}
                onReset={() => updateSnap(s.id, 'pending')}
                onDelete={() => deleteSnap(s.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, color, active, onClick }: any) {
  return (
    <button onClick={onClick} className="px-3 h-9 rounded border text-[12px] font-medium transition"
      style={{ background: active ? color : "transparent", borderColor: color, color: active ? "white" : color }}>
      {children}
    </button>
  );
}

function SnapCard({ snap, onAccept, onReject, onReset, onDelete }: {
  snap: Snap; onAccept: () => void; onReject: () => void; onReset: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCritical  = snap.severity === "critical";
  const labelColor  = isCritical ? "#E1261C" : "#D97706";
  const isAccepted  = snap.status === "accepted";
  const isRejected  = snap.status === "rejected";
  const conf        = snap.confidence ? Math.round(snap.confidence * 100) : null;
  const ts          = snap.captured_at || snap.detected_at;
  const timeStr     = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const imgUrl      = getImgUrl(snap);

  return (
    <div className={`relative bg-bg-surface border border-border-light rounded-md overflow-hidden transition ${isRejected ? "opacity-60" : ""}`}
      style={isAccepted ? { borderLeft: "3px solid #16A34A" } : {}}>

      {/* Delete button */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black/60 hover:bg-red-600 text-white transition"
        title="Delete snapshot">
        <Trash2 size={12} />
      </button>

      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-3">
          <p className="text-white text-[13px] font-medium">Delete this snapshot?</p>
          <div className="flex gap-2">
            <button onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="px-4 py-1.5 rounded bg-red-600 text-white text-[12px] font-medium hover:bg-red-700">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-4 py-1.5 rounded bg-white/20 text-white text-[12px] hover:bg-white/30">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Snapshot image */}
      <div className="relative bg-[#0A0F1A] h-[200px] overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={snap.violation_type} className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#16222F] via-[#0F1623] to-[#050810]" />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)" }} />
            <div className="absolute" style={{ left: "32%", top: "22%", width: "32%", height: "62%", border: `2px solid ${labelColor}`, boxShadow: `0 0 10px ${labelColor}66` }} />
          </>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold text-white" style={{ background: labelColor }}>{snap.violation_type}</div>
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white bg-black/60">{timeStr}</div>
        {conf !== null && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white" style={{ background: labelColor }}>{formatPct(conf)}</div>
        )}
      </div>

      <div className="px-3 py-2 text-[12px]">
        <div className="font-medium truncate">{snap.camera_name}</div>
        <div className="text-text-muted text-[11px] truncate">{snap.zone ?? '—'}</div>
      </div>

      <div className="px-3 pb-3">
        {snap.status === "pending" && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onAccept} className="flex items-center justify-center gap-1.5 h-9 rounded bg-[#16A34A] text-white text-[12.5px] font-medium hover:bg-[#15803D]">
              <CheckCircle2 size={14} /> Accept
            </button>
            <button onClick={onReject} className="flex items-center justify-center gap-1.5 h-9 rounded border border-brand-red text-brand-red text-[12.5px] font-medium hover:bg-[rgba(225,38,28,0.06)]">
              <X size={14} /> Reject
            </button>
          </div>
        )}
        {snap.status === "accepted" && (
          <button onClick={onReset} className="w-full h-9 rounded bg-[rgba(22,163,74,0.12)] text-[#15803D] text-[12.5px] font-semibold border border-[rgba(22,163,74,0.3)] hover:bg-[rgba(22,163,74,0.18)]">
            Accepted ✓ — click to revert
          </button>
        )}
        {snap.status === "rejected" && (
          <button onClick={onReset} className="w-full h-9 rounded bg-bg-surface-2 text-text-muted text-[12.5px] font-medium border border-border-light hover:bg-bg-surface">
            Rejected — click to revert
          </button>
        )}
      </div>
    </div>
  );
}