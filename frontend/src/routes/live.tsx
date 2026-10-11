import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Grid2x2, Grid3x3, Maximize2, X, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui-kit";
import { camerasAPI, BASE_URL } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { requireAuth } from "@/lib/authGuard";

export const Route = createFileRoute("/live")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Live Monitor — SafeVision AI" }] }),
  component: LivePage,
});

interface Camera {
  camera_id: string;
  name: string;
  location?: string;
  zone?: string;
  status: "online" | "offline" | "degraded";
  ip?: string;
  resolution?: string;
  fps?: number;
  last_seen?: string;
}

function LivePage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate({ to: '/login' });
  }, [navigate]);

  const [cameras, setCameras]   = useState<Camera[]>([]);
  const [loading, setLoading]   = useState(true);
  const [grid, setGrid]         = useState<2 | 3>(3);
  const [expand, setExpand]     = useState<Camera | null>(null);
  const [time, setTime]         = useState("");
  const [frame, setFrame]       = useState(18432);
  const [overlays, setOverlays] = useState({ boxes: true, labels: true, conf: true, zones: true, sound: false });

  // ── Fetch cameras ─────────────────────────────────────────────────────────
  const fetchCameras = useCallback(async () => {
    try {
      const data = await camerasAPI.getAll();
      const list: Camera[] = Array.isArray(data) ? data : (data.cameras ?? []);
      setCameras(list);
    } catch (e) {
      console.error('Cameras fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  // ── WebSocket — camera status updates ─────────────────────────────────────
  const handleWs = useCallback((msg: any) => {
    if (msg.type === 'camera_status') {
      setCameras((prev) => prev.map((c) =>
        c.camera_id === msg.camera_id ? { ...c, status: msg.status } : c
      ));
    }
    if (msg.type === 'violation_alert' || msg.type === 'new_violation') {
      fetchCameras();
    }
  }, [fetchCameras]);
  useWebSocket(handleWs);

  // ── Clock + frame counter ─────────────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      setFrame((f) => f + Math.floor(20 + Math.random() * 10));
    }, 1000);
    setTime(new Date().toLocaleTimeString());
    return () => clearInterval(i);
  }, []);

  const onlineCount  = cameras.filter((c) => c.status === 'online').length;
  const cols = grid === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex flex-col h-full bg-[#070B12]">
      {/* Header */}
      <div className="bg-bg-panel border-b border-border-panel px-6 py-3 flex items-center gap-3">
        <h1 className="font-display text-[18px] font-semibold text-text-on-dark">Live Monitor</h1>
        {!loading && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgba(5,150,105,0.2)] text-[#10B981] border border-[rgba(5,150,105,0.3)]">
            ● {onlineCount} camera{onlineCount !== 1 ? 's' : ''} active
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fetchCameras} className="p-1.5 rounded text-text-on-dark-muted hover:bg-bg-panel-hover"><RefreshCw size={15} /></button>
          <button onClick={() => setGrid(2)} className={`p-1.5 rounded ${grid === 2 ? "bg-bg-panel-hover text-brand-red" : "text-text-on-dark-muted"}`}><Grid2x2 size={16} /></button>
          <button onClick={() => setGrid(3)} className={`p-1.5 rounded ${grid === 3 ? "bg-bg-panel-hover text-brand-red" : "text-text-on-dark-muted"}`}><Grid3x3 size={16} /></button>
          <button className="p-1.5 rounded text-text-on-dark-muted hover:bg-bg-panel-hover"><Maximize2 size={16} /></button>
        </div>
      </div>

      {/* Camera grid */}
      <div className={`flex-1 p-3 overflow-auto grid ${cols} gap-3`}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video bg-[#0A0F1A] border border-[#1E2A3A] rounded overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>
          ))
        ) : cameras.length === 0 ? (
          <div className="col-span-full flex items-center justify-center text-[#6B7280] text-[13px] font-mono py-20">
            No cameras configured
          </div>
        ) : cameras.map((cam) => (
          <CameraCell key={cam.camera_id} cam={cam} time={time} overlays={overlays} onExpand={() => setExpand(cam)} />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="bg-bg-panel border-t border-border-panel px-4 py-2 flex items-center gap-4 text-[11px] text-text-on-dark-muted overflow-x-auto">
        {(["boxes", "labels", "conf", "zones", "sound"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={overlays[k]} onChange={(e) => setOverlays((s) => ({ ...s, [k]: e.target.checked }))} className="accent-brand-red" />
            <span className="capitalize">{k === "conf" ? "Confidence" : k === "boxes" ? "Bounding Boxes" : k === "zones" ? "Zone Overlays" : k === "sound" ? "Alert Sound" : "Labels"}</span>
          </label>
        ))}
        <button className="ml-auto px-2 py-1 rounded bg-brand-red text-white text-[11px]">Capture All</button>
        <span className="font-mono text-text-on-dark-muted">Frame {frame.toLocaleString()}</span>
      </div>

      {expand && <ExpandModal cam={expand} onClose={() => setExpand(null)} overlays={overlays} time={time} />}
    </div>
  );
}

// ── CameraCell ────────────────────────────────────────────────────────────────
function CameraCell({ cam, time, overlays, onExpand }: { cam: Camera; time: string; overlays: any; onExpand: () => void }) {
  const offline  = cam.status === "offline";
  const degraded = cam.status === "degraded";

  return (
    <div
      className="relative aspect-video bg-[#0A0F1A] border border-[#1E2A3A] rounded overflow-hidden group cursor-pointer"
      style={degraded ? { borderColor: "#D97706" } : {}}
      onClick={onExpand}
    >
      {!offline ? (
        <>
          <div className="scanline" />
          <LiveFeed cam={cam} />
          {overlays.zones && (
            <div className="absolute" style={{ left: "55%", top: "20%", width: "40%", height: "70%", border: "2px dashed rgba(225,38,28,0.4)", background: "rgba(225,38,28,0.03)" }}>
              <div className="absolute -top-5 left-0 text-[9px] font-mono text-[#E1261C] bg-black/70 px-1.5 py-0.5 rounded">MONITORED ZONE</div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[#6B7280] text-[12px] font-mono">
          ✗ Feed Unavailable{cam.last_seen ? ` — Last seen: ${new Date(cam.last_seen).toLocaleTimeString()}` : ''}
        </div>
      )}

      {/* Camera name */}
      <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-white font-mono text-[10.5px]">{cam.name}</div>

      {/* Status badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {!offline && <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-[#10B981]">AI ●</span>}
        <div className="bg-black/70 px-2 py-1 rounded flex items-center gap-1 text-[10px] font-mono">
          {offline ? (
            <span className="text-[#6B7280]">OFFLINE</span>
          ) : degraded ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /><span className="text-[#D97706]">DEGRADED</span></>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" /><span className="text-white">LIVE</span></>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-2 left-2 text-white/80 font-mono text-[10px]">{time}</div>
      <div className="absolute bottom-2 right-2 text-[#9CA3AF] font-mono text-[10px]">
        {cam.resolution ?? '1080p'} · {cam.fps ?? 25}fps
      </div>

      {/* Location badge */}
      {cam.location && (
        <div className="absolute bottom-8 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-[#9CA3AF]">{cam.location}</div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-bg-panel text-text-on-dark text-[12px] px-3 py-1.5 rounded flex items-center gap-1.5 border border-border-panel">
          <Maximize2 size={12} /> Expand
        </div>
      </div>
    </div>
  );
}

// ── LiveFeed ──────────────────────────────────────────────────────────────────
function LiveFeed({ cam }: { cam: Camera }) {
  const [err, setErr] = useState(false);
  const token = localStorage.getItem('token') ?? '';
  const src = `${BASE_URL}/api/cameras/stream/${cam.camera_id}`;

  if (err) return <FauxFeed />;   // fallback if stream fails

  return (
    <img
      src={src}
      alt={cam.name}
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setErr(true)}
    />
  );
}


// ── FauxFeed ──────────────────────────────────────────────────────────────────
function FauxFeed() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F1923] via-[#16222F] to-[#0A0F1A]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)" }} />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, rgba(255,150,100,0.15), transparent 40%), radial-gradient(circle at 70% 30%, rgba(80,120,200,0.1), transparent 40%)" }} />
    </div>
  );
}

// ── ExpandModal ───────────────────────────────────────────────────────────────
function ExpandModal({ cam, onClose, overlays, time }: { cam: Camera; onClose: () => void; overlays: any; time: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const offline = cam.status === "offline";

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-stretch p-6 gap-4">
      <div className="flex-1 relative bg-[#0A0F1A] rounded border border-[#1E2A3A] overflow-hidden">
        {!offline ? (
          <>
            <div className="scanline" />
            <LiveFeed cam={cam} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#6B7280] text-[13px] font-mono">✗ Feed Unavailable</div>
        )}
        <div className="absolute top-3 left-3 bg-black/70 px-2 py-1 rounded text-white font-mono text-[12px]">{cam.name}</div>
        <div className="absolute bottom-3 left-3 text-white/80 font-mono text-[11px]">{time}</div>
        <button onClick={onClose} className="absolute top-3 right-3 bg-black/70 hover:bg-bg-panel-hover text-white p-2 rounded"><X size={16} /></button>
      </div>

      <div className="w-[300px] bg-bg-panel border border-border-panel rounded p-4 text-text-on-dark space-y-3 overflow-y-auto dark-scroll">
        <div>
          <h3 className="font-display font-semibold text-[15px]">{cam.name}</h3>
          <p className="text-[11px] text-text-on-dark-muted">{cam.location ?? '—'}</p>
        </div>
        {cam.ip         && <CamMeta label="IP"         value={cam.ip}    mono />}
        {cam.zone       && <CamMeta label="Zone"       value={cam.zone} />}
        <CamMeta label="Status"     value={cam.status.toUpperCase()} />
        <CamMeta label="AI Model"   value="YOLOv11m Safety" />
        <CamMeta label="Resolution" value={cam.resolution ?? '1080p'} />
        <CamMeta label="FPS"        value={String(cam.fps ?? 25)} mono />

        <div className="border-t border-border-panel pt-3">
          <div className="text-[10px] uppercase tracking-widest text-text-on-dark-muted mb-1.5">Status Indicator</div>
          <div className="flex items-center gap-2 text-[12px]">
            <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: cam.status === "online" ? "#10B981" : cam.status === "degraded" ? "#D97706" : "#6B7280" }} />
            <span>{cam.status === "online" ? "Live feed — AI active" : cam.status === "degraded" ? "Degraded signal" : "Feed unavailable"}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border-panel pt-3">
          <button className="w-full px-3 py-2 bg-brand-red text-white text-[12px] rounded">Capture Snapshot</button>
          <button className="w-full px-3 py-2 border border-border-panel text-text-on-dark text-[12px] rounded hover:bg-bg-panel-hover">Raise Alert</button>
          <button className="w-full px-3 py-2 border border-border-panel text-text-on-dark text-[12px] rounded hover:bg-bg-panel-hover">Mark Incident</button>
        </div>
      </div>
    </div>
  );
}

function CamMeta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-text-on-dark-muted">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}