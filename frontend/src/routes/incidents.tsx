import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, SeverityBadge, Skeleton } from "@/components/ui-kit";
import { alertsAPI } from "@/lib/api";
import { Play, Pause, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/incidents")({
  head: () => ({ meta: [{ title: "Investigations — SafeVision AI" }] }),
  component: IncidentsPage,
});

const SNAP_BASE = "http://localhost:8000/snapshots/";

function IncidentsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(50);
  const [snapIdx, setSnapIdx] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    alertsAPI.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.alerts ?? [];
        setAlerts(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => toast.error("Failed to load incidents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => {
      setCursor((c) => (c >= 100 ? 0 : c + 1));
      setSnapIdx((s) => (s + 1) % 5);
    }, 500);
    return () => clearInterval(i);
  }, [playing]);

  const filtered = alerts.filter((a) =>
    `${a.alert_code ?? a.id} ${a.violation_type ?? a.type} ${a.camera_name ?? a.cameraName}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dt: string) => {
    if (!dt) return "—";
    try { return new Date(dt).toLocaleTimeString("en-IN", { hour12: false }); }
    catch { return dt; }
  };

  return (
    <div>
      <PageHeader title="Investigations" subtitle="Incident timeline & frame-level forensics" />
      <div className="flex h-[calc(100vh-180px)] border-t border-border-light">

        {/* Left list */}
        <div className="w-96 border-r border-border-light bg-bg-surface flex flex-col">
          <div className="p-3 border-b border-border-light relative">
            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="w-full h-9 pl-8 pr-3 border border-border-medium rounded text-[13px]" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border-light">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-16" /></div>
              ))
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-[13px]">
                {alerts.length === 0 ? "No incidents yet — system is monitoring." : "No results match your search."}
              </div>
            ) : (
              filtered.map((a) => {
                const id = a.alert_code ?? `ALT-${a.id}`;
                const type = a.violation_type ?? a.type ?? "Unknown";
                const camera = a.camera_name ?? a.cameraName ?? "—";
                const severity = a.severity ?? "Low";
                const confidence = a.confidence ?? 0;
                const time = formatTime(a.created_at ?? a.timestamp);
                const active = selected?.id === a.id;
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className={`w-full px-4 py-3 text-left ${active ? "bg-bg-surface-2 border-l-2 border-brand-red" : "hover:bg-bg-surface-2"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] text-text-secondary">{time}</span>
                      <SeverityBadge severity={severity.charAt(0).toUpperCase() + severity.slice(1)} />
                    </div>
                    <div className="text-[13px] font-medium mt-1">{type}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{camera}</div>
                    <div className="text-[10px] font-mono text-text-muted mt-1">Conf: {confidence.toFixed(1)}%</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right detail */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-text-muted text-[13px]">
              Select an incident to investigate.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-[16px]">
                  {selected.alert_code ?? `ALT-${selected.id}`}
                </h2>
                <SeverityBadge severity={(selected.severity ?? "low").charAt(0).toUpperCase() + (selected.severity ?? "low").slice(1)} />
                <span className="text-[12px] text-text-muted ml-2">
                  {selected.camera_name ?? "—"} · {selected.zone ?? "—"}
                </span>
              </div>

              {/* Snapshot */}
              <Card>
                <h3 className="text-[12px] uppercase tracking-widest text-text-muted mb-3">Snapshot</h3>
                {selected.snapshot_path ? (
                  <div className="flex gap-2 overflow-x-auto">
                    {[selected.snapshot_path].map((snap: string, i: number) => (
                      <div key={i} onClick={() => setSnapIdx(i)}
                        className={`shrink-0 w-40 aspect-video rounded relative overflow-hidden cursor-pointer border-2 ${snapIdx === i ? "border-brand-red" : "border-transparent"}`}>
                        <img
                          src={snap.startsWith("http") ? snap : `${SNAP_BASE}${snap}`}
                          alt="snapshot"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute bottom-1 left-1 text-[9px] font-mono text-white/80 bg-black/50 px-1 rounded">
                          {formatTime(selected.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-[#0A0F1A] rounded flex items-center justify-center text-text-muted text-[12px]">
                    No snapshot available
                  </div>
                )}
              </Card>

              {/* Playback */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] uppercase tracking-widest text-text-muted">Event Playback (±5min)</h3>
                  <button onClick={() => setPlaying((p) => !p)}
                    className="flex items-center gap-1 px-2 py-1 bg-brand-red text-white rounded text-[11px]">
                    {playing ? <Pause size={12} /> : <Play size={12} />}
                    {playing ? "Pause" : "Play"}
                  </button>
                </div>
                <div className="relative h-12 bg-bg-surface-2 rounded overflow-hidden">
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex items-center px-2">
                    {Array.from({ length: 40 }, (_, i) => (
                      <div key={i} className="flex-1 flex justify-center">
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ background: i === 18 || i === 19 ? "#E1261C" : "#16A34A" }} />
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-brand-red transition-all" style={{ left: `${cursor}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-mono text-text-muted">
                  <span>-5min</span><span>0</span><span>+5min</span>
                </div>
              </Card>

              {/* Detection details */}
              <Card padding="p-0">
                <div className="px-4 py-3 border-b border-border-light">
                  <h3 className="text-[12px] uppercase tracking-widest text-text-muted">Detection Details</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3 text-[12px]">
                  {[
                    ["Violation Type", selected.violation_type ?? selected.type ?? "—"],
                    ["Confidence", `${(selected.confidence ?? 0).toFixed(1)}%`],
                    ["Camera", selected.camera_name ?? "—"],
                    ["Zone", selected.zone ?? "—"],
                    ["Status", selected.status ?? "—"],
                    ["Assigned To", selected.assigned_to ?? "Unassigned"],
                    ["Detected At", formatTime(selected.created_at)],
                    ["Severity", selected.severity ?? "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
                      <div className="font-medium mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
                {selected.notes && (
                  <div className="px-4 pb-4">
                    <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Notes</div>
                    <div className="text-[12px] text-text-secondary">{selected.notes}</div>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}