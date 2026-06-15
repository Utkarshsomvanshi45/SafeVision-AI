import { useEffect } from "react";
import { useSentinelStore } from "@/lib/store";
import { alertsAPI, camerasAPI } from "@/lib/api";

export function useLiveSimulation(enabled: boolean = true) {
  const tickAi = useSentinelStore((s) => s.tickAi);
  const tickDetectionTimer = useSentinelStore((s) => s.tickDetectionTimer);
  const tickTelemetry = useSentinelStore((s) => s.tickTelemetry);
  const setAlerts = useSentinelStore((s) => s.setAlerts);
  const setCamerasOnline = useSentinelStore((s) => s.setCamerasOnline);

  // Load real alerts from backend on mount
  useEffect(() => {
    if (!enabled) return;
    alertsAPI.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.alerts ?? []);
        // Map backend fields to frontend Alert shape
        const mapped = list.map((a: any) => ({
          id: String(a.id),
          timestamp: a.created_at
            ? new Date(a.created_at).toLocaleTimeString("en-IN", { hour12: false })
            : "—",
          cameraId: a.camera_id ?? "",
          cameraName: a.camera_name ?? "—",
          zone: a.zone ?? "—",
          type: a.violation_type ?? "Unknown",
          severity: (a.severity?.charAt(0).toUpperCase() + a.severity?.slice(1)) ?? "Low",
          confidence: a.confidence ?? 0,
          status: a.status ?? "Open",
          assigned: a.assigned_to ?? "Unassigned",
          isNew: false,
          snapshot_path: a.snapshot_path ?? null,
          aiReasoning: `YOLOv11m · ${(a.confidence ?? 0).toFixed(1)}% confidence`,
        }));
        setAlerts(mapped);
      })
      .catch(() => {
        // If API fails, keep empty — no dummy fallback
        setAlerts([]);
      });
  }, [enabled, setAlerts]);

  // Load real camera counts
  useEffect(() => {
    if (!enabled) return;
    camerasAPI.getAll()
      .then((data) => {
        const cams = Array.isArray(data) ? data : (data.cameras ?? []);
        const online = cams.filter((c: any) => c.status === "online").length;
        setCamerasOnline(online, cams.length);
      })
      .catch(() => setCamerasOnline(0, 0));

    // Refresh cameras every 30s
    const i = setInterval(() => {
      camerasAPI.getAll()
        .then((data) => {
          const cams = Array.isArray(data) ? data : (data.cameras ?? []);
          const online = cams.filter((c: any) => c.status === "online").length;
          setCamerasOnline(online, cams.length);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(i);
  }, [enabled, setCamerasOnline]);

  // AI frames ticker — real backend is running so keep this for live feel
  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(() => tickAi(Math.floor(Math.random() * 11) - 5), 3000);
    return () => clearInterval(i);
  }, [tickAi, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(() => tickDetectionTimer(), 1000);
    return () => clearInterval(i);
  }, [tickDetectionTimer, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(() => tickTelemetry(), 2500);
    return () => clearInterval(i);
  }, [tickTelemetry, enabled]);
}
