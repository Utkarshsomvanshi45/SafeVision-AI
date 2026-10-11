import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Skeleton } from "@/components/ui-kit";
import { Plus, Search, X, RefreshCw, Move } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/zones")({
  head: () => ({ meta: [{ title: "Zone Control — SafeVision AI" }] }),
  component: ZonesPage,
});

const BASE     = BASE_URL;
const authHdr  = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const apiFetch = (url: string) => fetch(`${BASE}${url}`, { headers: authHdr() }).then((r) => r.json());

// ── Default zone geometry ──────────────────────────────────────────────────────
const DEFAULT_GEO: Record<string, { x: number; y: number; w: number; h: number }> = {
  "BC Load Area Zone":  { x: 40,  y: 40,  w: 200, h: 130 },
  "HR Slitting Zone":   { x: 280, y: 30,  w: 220, h: 140 },
  "CRNCTL Zone":        { x: 545, y: 50,  w: 175, h: 120 },
  "Scrap Yard Zone":    { x: 50,  y: 210, w: 240, h: 120 },
  "Weight Bridge Zone": { x: 340, y: 200, w: 160, h: 110 },
  "Trap Area Zone":     { x: 340, y: 340, w: 160, h: 100 },
  "Security Gate Zone": { x: 555, y: 210, w: 165, h: 110 },
  "Coke Oven Battery":  { x: 560, y: 340, w: 160, h: 100 },
  "Sinter Plant":       { x: 80,  y: 350, w: 200, h: 100 },
};

const GEO_STORAGE_KEY = "sv_zone_geometry";

function loadGeo(): Record<string, { x: number; y: number; w: number; h: number }> {
  try {
    const saved = localStorage.getItem(GEO_STORAGE_KEY);
    if (saved) return { ...DEFAULT_GEO, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_GEO };
}

function saveGeo(geo: Record<string, { x: number; y: number; w: number; h: number }>) {
  localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(geo));
}

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
interface ZoneEntry {
  name: string; risk: RiskLevel; description: string;
  x: number; y: number; w: number; h: number; custom?: boolean;
}

const riskColor = (r: RiskLevel) =>
  r === "HIGH" ? "#E1261C" : r === "MEDIUM" ? "#D97706" : "#16A34A";

const riskFill = (r: RiskLevel) =>
  r === "HIGH" ? "rgba(225,38,28,0.15)" : r === "MEDIUM" ? "rgba(217,119,6,0.12)" : "rgba(22,163,74,0.10)";

// ── SVG viewport ───────────────────────────────────────────────────────────────
const VW = 760; const VH = 470;

function ZonesPage() {
  const [cameras, setCameras]   = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [zones, setZones]       = useState<ZoneEntry[]>([]);
  const [geo, setGeo]           = useState<Record<string, { x: number; y: number; w: number; h: number }>>(loadGeo);
  const [selected, setSelected] = useState<string>("");
  const [mode, setMode]         = useState<"view" | "edit">("view");
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [newRisk, setNewRisk]   = useState<RiskLevel>("MEDIUM");
  const [newDesc, setNewDesc]   = useState("");
  const [pendingRisk, setPendingRisk] = useState<RiskLevel | null>(null);
  const [pendingDesc, setPendingDesc] = useState<string | null>(null);

  // ── Drag state ────────────────────────────────────────────────────────────
  const svgRef       = useRef<SVGSVGElement>(null);
  const dragInfo     = useRef<{ name: string; mode: "move" | "resize"; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [cams, stats] = await Promise.all([
        apiFetch("/api/cameras/"),
        apiFetch("/api/violations/stats"),
      ]);
      const camList: any[] = Array.isArray(cams) ? cams : [];
      setCameras(camList);
      setViolations(stats.by_camera ?? []);

      const g = loadGeo();
      const zoneNames = new Set<string>(Object.keys(DEFAULT_GEO));
      camList.forEach((c) => { if (c.zone) zoneNames.add(c.zone); });

      const built: ZoneEntry[] = Array.from(zoneNames).map((name) => {
        const saved = g[name];
        const geo   = saved ?? { x: 60 + Math.random() * 400, y: 60 + Math.random() * 300, w: 160, h: 100 };
        const risk: RiskLevel = name.includes("BC Load") || name.includes("HR Slitting") ? "HIGH"
          : name.includes("Scrap") || name.includes("CRNCTL") || name.includes("Weight") ? "MEDIUM" : "LOW";
        return { name, risk, description: "Safety compliance zone. PPE required.", ...geo };
      });

      setZones(built);
      if (built.length > 0 && !selected) setSelected(built[0].name);
    } catch (e) {
      toast.error("Failed to load zone data");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ── Sync geo into zones ────────────────────────────────────────────────────
  useEffect(() => {
    setZones((prev) => prev.map((z) => ({ ...z, ...(geo[z.name] ?? {}) })));
  }, [geo]);

  // ── SVG mouse helpers ─────────────────────────────────────────────────────
  const getSVGPoint = (e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect  = svg.getBoundingClientRect();
    const scaleX = VW / rect.width;
    const scaleY = VH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onZoneMouseDown = (e: React.MouseEvent, name: string, dragMode: "move" | "resize") => {
    if (mode !== "edit") return;
    e.preventDefault();
    e.stopPropagation();
    const pt    = getSVGPoint(e);
    const z     = zones.find((z) => z.name === name)!;
    dragInfo.current = { name, mode: dragMode, startX: pt.x, startY: pt.y, origX: z.x, origY: z.y, origW: z.w, origH: z.h };
    setDragging(name);
    setSelected(name);
  };

  const onSVGMouseMove = useCallback((e: MouseEvent) => {
    if (!dragInfo.current) return;
    const pt  = getSVGPoint(e);
    const dx  = pt.x - dragInfo.current.startX;
    const dy  = pt.y - dragInfo.current.startY;
    const { name, mode: dm, origX, origY, origW, origH } = dragInfo.current;

    setGeo((prev) => {
      const updated = { ...prev };
      if (dm === "move") {
        updated[name] = {
          x: Math.max(5, Math.min(VW - origW - 5, origX + dx)),
          y: Math.max(5, Math.min(VH - origH - 30, origY + dy)),
          w: origW, h: origH,
        };
      } else {
        updated[name] = {
          x: origX, y: origY,
          w: Math.max(100, origW + dx),
          h: Math.max(70,  origH + dy),
        };
      }
      return updated;
    });
  }, []);

  const onSVGMouseUp = useCallback(() => {
    if (!dragInfo.current) return;
    setGeo((prev) => { saveGeo(prev); return prev; });
    dragInfo.current = null;
    setDragging(null);
    toast.success("Zone position saved", { duration: 1500 });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onSVGMouseMove);
    window.addEventListener("mouseup",   onSVGMouseUp);
    return () => {
      window.removeEventListener("mousemove", onSVGMouseMove);
      window.removeEventListener("mouseup",   onSVGMouseUp);
    };
  }, [onSVGMouseMove, onSVGMouseUp]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCams = (name: string) => cameras.filter((c) => c.zone === name);
  const getViol = (name: string) => {
    const camNames = getCams(name).map((c) => c.name);
    return violations.filter((v) => camNames.includes(v.camera)).reduce((s, v) => s + v.count, 0);
  };

  const sel     = zones.find((z) => z.name === selected);
  const selCams = sel ? getCams(sel.name) : [];
  const selViol = sel ? getViol(sel.name) : 0;
  const curRisk = pendingRisk ?? sel?.risk ?? "LOW";
  const curDesc = pendingDesc ?? sel?.description ?? "";

  const saveChanges = () => {
    setZones((prev) => prev.map((z) => z.name === selected ? {
      ...z, risk: pendingRisk ?? z.risk, description: pendingDesc ?? z.description
    } : z));
    setPendingRisk(null); setPendingDesc(null);
    toast.success(`${selected} — saved`);
  };

  const addZone = () => {
    if (!newName.trim()) { toast.error("Zone name required"); return; }
    if (zones.find((z) => z.name === newName.trim())) { toast.error("Zone already exists"); return; }
    const newGeo = { x: 80, y: 80, w: 180, h: 110 };
    const entry: ZoneEntry = { name: newName.trim(), risk: newRisk, description: newDesc || "Custom zone.", ...newGeo, custom: true };
    setZones((z) => [...z, entry]);
    setGeo((g) => { const ng = { ...g, [newName.trim()]: newGeo }; saveGeo(ng); return ng; });
    setSelected(entry.name);
    setShowAdd(false); setNewName(""); setNewRisk("MEDIUM"); setNewDesc("");
    toast.success(`Zone "${entry.name}" added — drag it to position in EDIT mode`);
  };

  const deleteZone = (name: string) => {
    if (!zones.find((z) => z.name === name)?.custom) { toast.error("Cannot delete default zones"); return; }
    setZones((z) => z.filter((x) => x.name !== name));
    setGeo((g) => { const ng = { ...g }; delete ng[name]; saveGeo(ng); return ng; });
    setSelected(zones.find((z) => !z.custom)?.name ?? "");
    toast.success(`Zone "${name}" deleted`);
  };

  const resetLayout = () => {
    saveGeo(DEFAULT_GEO);
    setGeo({ ...DEFAULT_GEO });
    toast.success("Layout reset to default");
  };

  return (
    <div>
      <PageHeader title="Zone Control" subtitle="Plant zone management & detection rules"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetLayout} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 12, cursor: "pointer" }}>Reset Layout</button>
            <button onClick={fetchData}   style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 6, height: 36, padding: "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><RefreshCw size={14} /> Refresh</button>
          </div>
        } />

      <div style={{ display: "flex", height: "calc(100vh - 180px)", borderTop: "1px solid #e5e7eb" }}>

        {/* ── Left list ──────────────────────────────────────────────────── */}
        <div style={{ width: 300, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Plant Zones</span>
            <button onClick={() => setShowAdd(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#E1261C" }}><Plus size={16} /></button>
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search zones"
              style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 10, border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ padding: 12 }}><Skeleton className="h-12" /></div>
            )) : zones.filter((z) => z.name.toLowerCase().includes(search.toLowerCase())).map((z) => {
              const color   = riskColor(z.risk);
              const active  = selected === z.name;
              const camCnt  = getCams(z.name).length;
              const vCount  = getViol(z.name);
              return (
                <button key={z.name} onClick={() => { setSelected(z.name); setPendingRisk(null); setPendingDesc(null); }}
                  style={{ width: "100%", padding: "10px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 8, background: active ? "#fff9f9" : "#fff", borderLeft: active ? "2px solid #E1261C" : "2px solid transparent", borderBottom: "1px solid #f3f4f6", cursor: "pointer", border: "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.name}</div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{camCnt} camera{camCnt !== 1 ? "s" : ""}{z.custom ? " · Custom" : ""}</div>
                  </div>
                  <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono", padding: "1px 5px", borderRadius: 3, color, background: `${color}22` }}>{z.risk}</span>
                  {vCount > 0 && <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", background: "#E1261C", color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{vCount}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SVG Floor plan ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, background: "#0F1923", position: "relative", overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: 2 }}>
              {(["view", "edit"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ padding: "4px 14px", borderRadius: 3, fontSize: 11, fontFamily: "IBM Plex Mono", border: "none", cursor: "pointer", background: mode === m ? "#E1261C" : "transparent", color: mode === m ? "#fff" : "#9ca3af" }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {mode === "edit" && (
              <div style={{ fontSize: 11, color: "#D97706", fontFamily: "IBM Plex Mono", background: "rgba(217,119,6,0.15)", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(217,119,6,0.3)" }}>
                ✎ EDIT MODE — Drag zones to move · Drag ◢ corner to resize
              </div>
            )}
            {/* Legend */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 10, fontFamily: "IBM Plex Mono" }}>
              {[["HIGH","#E1261C"],["MEDIUM","#D97706"],["LOW","#16A34A"],["CAMERA","#10B981"]].map(([l,c]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, color: c as string }}>
                  <span style={{ width: l === "CAMERA" ? 7 : 8, height: l === "CAMERA" ? 7 : 8, borderRadius: l === "CAMERA" ? "50%" : 2, background: c as string, display: "inline-block" }} />{l}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", fontFamily: "IBM Plex Mono", fontSize: 13 }}>
              Loading zone data...
            </div>
          ) : (
            <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "100%", userSelect: "none" }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={VW} height={VH} fill="url(#grid)" />
              <rect x="10" y="10" width={VW-20} height={VH-20} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="8 4" rx="4" />
              <text x={VW/2} y={VH-8} fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="IBM Plex Mono" textAnchor="middle">AM/NS India — Talegaon Plant</text>

              {zones.map((z) => {
                const color   = riskColor(z.risk);
                const fill    = riskFill(z.risk);
                const isSel   = z.name === selected;
                const isDrag  = dragging === z.name;
                const zoneCams = getCams(z.name);
                const vCount  = getViol(z.name);
                const canDrag = mode === "edit";

                return (
                  <g key={z.name}>
                    {/* Zone rect */}
                    <rect x={z.x} y={z.y} width={z.w} height={z.h}
                      fill={fill} stroke={color} strokeWidth={isSel ? 2.5 : 1.5} rx="3"
                      style={{
                        filter: isSel ? `drop-shadow(0 0 8px ${color}99)` : "none",
                        cursor: canDrag ? "move" : "pointer",
                      }}
                      onClick={() => { setSelected(z.name); setPendingRisk(null); setPendingDesc(null); }}
                      onMouseDown={(e) => { setSelected(z.name); onZoneMouseDown(e, z.name, "move"); }}
                    />

                    {/* Zone name + risk */}
                    <text x={z.x + 8} y={z.y + 16} fill="#F9FAFB" fontSize="10" fontFamily="IBM Plex Sans" fontWeight="500" style={{ pointerEvents: "none" }}>{z.name}</text>
                    <text x={z.x + 8} y={z.y + 27} fill="#9CA3AF" fontSize="7.5" fontFamily="IBM Plex Mono" style={{ pointerEvents: "none" }}>{z.risk}</text>

                    {/* Camera dots */}
                    {zoneCams.map((c, i) => (
                      <g key={c.camera_id} style={{ pointerEvents: "none" }}>
                        <circle cx={z.x + 12 + i * 18} cy={z.y + z.h - 14} r={5}
                          fill={c.status === "online" ? "#10B981" : c.status === "degraded" ? "#D97706" : "#6B7280"}
                          stroke="#0F1923" strokeWidth="1.5">
                          <title>{c.name} — {c.status}</title>
                        </circle>
                        <text x={z.x + 12 + i * 18} y={z.y + z.h - 22} fill="#9CA3AF" fontSize="6.5" fontFamily="IBM Plex Mono" textAnchor="middle">{c.name.slice(0, 5)}</text>
                      </g>
                    ))}

                    {/* Violation badge */}
                    {vCount > 0 && (
                      <g style={{ pointerEvents: "none" }}>
                        <circle cx={z.x + z.w - 10} cy={z.y + 10} r={9} fill="#E1261C" />
                        <text x={z.x + z.w - 10} y={z.y + 14} fill="#fff" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle" fontWeight="bold">{vCount}</text>
                      </g>
                    )}

                    {/* Edit mode indicators */}
                    {canDrag && isSel && (
                      <>
                        {/* Move icon */}
                        <rect x={z.x + z.w/2 - 8} y={z.y + 3} width={16} height={14} rx="2" fill="rgba(255,255,255,0.15)" style={{ cursor: "move" }}
                          onMouseDown={(e) => onZoneMouseDown(e, z.name, "move")} />
                        <text x={z.x + z.w/2} y={z.y + 13} fill="#fff" fontSize="9" textAnchor="middle" style={{ pointerEvents: "none" }}>⊹</text>

                        {/* Resize handle — bottom-right corner */}
                        <rect x={z.x + z.w - 14} y={z.y + z.h - 14} width={14} height={14}
                          fill={color} opacity={0.8} rx="2" style={{ cursor: "se-resize" }}
                          onMouseDown={(e) => onZoneMouseDown(e, z.name, "resize")} />
                        <text x={z.x + z.w - 7} y={z.y + z.h - 4} fill="#fff" fontSize="9" textAnchor="middle" style={{ pointerEvents: "none" }}>◢</text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* ── Right detail panel ─────────────────────────────────────────── */}
        <div style={{ width: 270, background: "#fff", borderLeft: "1px solid #e5e7eb", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {!sel ? (
            <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", paddingTop: 32 }}>Select a zone</div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af" }}>Zone</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 3, fontFamily: "DM Sans" }}>{sel.name}</div>
                {sel.custom && <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono", background: "#EFF6FF", color: "#2563EB", padding: "1px 6px", borderRadius: 3, marginTop: 3, display: "inline-block" }}>CUSTOM</span>}
              </div>

              <div>
                <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>Risk Level</label>
                <select value={curRisk} onChange={(e) => setPendingRisk(e.target.value as RiskLevel)}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 13, outline: "none" }}>
                  <option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor(curRisk), display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: riskColor(curRisk), fontFamily: "IBM Plex Mono" }}>{curRisk} RISK</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>Description</label>
                <textarea rows={2} value={curDesc} onChange={(e) => setPendingDesc(e.target.value)}
                  style={{ display: "block", marginTop: 4, width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 12, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 6 }}>
                  Cameras Covering ({selCams.length})
                </div>
                {selCams.length > 0 ? selCams.map((c) => (
                  <div key={c.camera_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 500, color: "#111827" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{c.location ?? "—"}</div>
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono", padding: "1px 5px", borderRadius: 3,
                      background: c.status === "online" ? "#F0FDF4" : c.status === "degraded" ? "#FEF3C7" : "#F3F4F6",
                      color: c.status === "online" ? "#15803D" : c.status === "degraded" ? "#92400E" : "#6B7280" }}>
                      {(c.status ?? "—").toUpperCase()}
                    </span>
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>No cameras assigned to this zone</div>
                )}
              </div>

              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 8 }}>Today's Stats</div>
                {[
                  ["Violations", String(selViol), selViol > 0],
                  ["Cameras online", `${selCams.filter(c => c.status === "online").length}/${selCams.length}`, false],
                  ["AI active", selCams.filter(c => c.is_ai_active).length > 0 ? "✅ Yes" : "❌ No", false],
                  ["Zone size", `${Math.round(sel.w)} × ${Math.round(sel.h)}`, false],
                ].map(([l, v, hl]) => (
                  <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #f9fafb" }}>
                    <span style={{ color: "#9ca3af" }}>{l as string}</span>
                    <span style={{ fontFamily: "IBM Plex Mono", color: hl ? "#E1261C" : "#374151", fontWeight: hl ? 600 : 400 }}>{v as string}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 8 }}>Detection Rules</div>
                {[
                  ["Helmet detection",    true],
                  ["Jacket detection",    true],
                  ["Zone intrusion",      curRisk !== "LOW"],
                  ["Crowd density alert", curRisk === "HIGH"],
                  ["Unauthorized entry",  curRisk === "HIGH"],
                ].map(([rule, chk]) => (
                  <label key={rule as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "4px 0", cursor: "pointer" }}>
                    <span style={{ color: "#374151" }}>{rule as string}</span>
                    <input type="checkbox" defaultChecked={chk as boolean} style={{ accentColor: "#E1261C" }} />
                  </label>
                ))}
              </div>

              <button onClick={saveChanges} disabled={!pendingRisk && pendingDesc === null}
                style={{ width: "100%", height: 38, borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#fff",
                  background: (!pendingRisk && pendingDesc === null) ? "#d1d5db" : "#E1261C",
                  border: "none", cursor: (!pendingRisk && pendingDesc === null) ? "not-allowed" : "pointer" }}>
                {(!pendingRisk && pendingDesc === null) ? "No Changes" : "Save Changes"}
              </button>

              {sel.custom && (
                <button onClick={() => deleteZone(selected)}
                  style={{ width: "100%", height: 36, borderRadius: 6, fontSize: 13, color: "#E1261C",
                    background: "rgba(225,38,28,0.06)", border: "1px solid rgba(225,38,28,0.3)", cursor: "pointer" }}>
                  Delete Zone
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Zone Modal ────────────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "DM Sans" }}>Add New Zone</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Zone Name *", newName, setNewName, "e.g. Blast Furnace Zone"],
                ["Description", newDesc, setNewDesc, "PPE rules for this zone"]].map(([label, val, setter, ph]) => (
                <div key={label as string}>
                  <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{label as string}</label>
                  <input value={val as string} onChange={(e) => (setter as any)(e.target.value)} placeholder={ph as string}
                    style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Risk Level</label>
                <select value={newRisk} onChange={(e) => setNewRisk(e.target.value as RiskLevel)}
                  style={{ display: "block", marginTop: 4, width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none" }}>
                  <option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
                </select>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", background: "#f9fafb", padding: "8px 12px", borderRadius: 4, border: "1px solid #e5e7eb" }}>
                💡 After adding, switch to <strong>EDIT mode</strong> and drag the zone to position it on the floor plan.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "0 16px", height: 36, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={addZone} style={{ padding: "0 16px", height: 36, background: "#E1261C", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Add Zone</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}