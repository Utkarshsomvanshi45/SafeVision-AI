import { create } from "zustand";
import { AI_NODES, ENV_SENSORS, type Alert, type AINode } from "./data";

interface SentinelState {
  alerts: Alert[];
  aiFramesPerMin: number;
  lastDetectionSec: number;
  framesAnalyzed: number;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  aiNodes: AINode[];
  gpuAvg: number;
  latencyMs: number;
  inferenceQps: number;
  env: typeof ENV_SENSORS;
  copilotOpen: boolean;
  plantRiskScore: number;
  camerasOnline: number;
  camerasTotal: number;
  criticalCount: number;
  addAlert: (a: Alert) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  setAlerts: (alerts: Alert[]) => void;
  tickAi: (delta: number) => void;
  tickDetectionTimer: () => void;
  tickTelemetry: () => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  setCopilotOpen: (v: boolean) => void;
  setCamerasOnline: (online: number, total: number) => void;
}

function jitter(v: number, amt: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v + (Math.random() - 0.5) * amt));
}

export const useSentinelStore = create<SentinelState>((set) => ({
  alerts: [],          // ← empty — no dummy data
  aiFramesPerMin: 89,
  lastDetectionSec: 0,
  framesAnalyzed: 0,   // ← starts at 0
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  aiNodes: AI_NODES,
  gpuAvg: 62,
  latencyMs: 38,
  inferenceQps: 0,
  env: ENV_SENSORS,
  copilotOpen: false,
  plantRiskScore: 0,
  camerasOnline: 0,
  camerasTotal: 0,
  criticalCount: 0,

  addAlert: (a) =>
    set((s) => ({
      alerts: [a, ...s.alerts],
      lastDetectionSec: 0,
      framesAnalyzed: s.framesAnalyzed + Math.floor(20 + Math.random() * 30),
      criticalCount: a.severity === "Critical"
        ? s.criticalCount + 1
        : s.criticalCount,
    })),

  updateAlert: (id, patch) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  setAlerts: (alerts) =>
    set(() => ({
      alerts,
      criticalCount: alerts.filter(
        (a) => a.severity === "Critical" && a.status !== "Resolved"
      ).length,
    })),

  tickAi: (delta) =>
    set((s) => ({
      aiFramesPerMin: Math.max(60, Math.min(140, s.aiFramesPerMin + delta)),
      framesAnalyzed: s.framesAnalyzed + Math.max(0, Math.floor(s.aiFramesPerMin / 20)),
    })),

  tickDetectionTimer: () =>
    set((s) => ({ lastDetectionSec: s.lastDetectionSec + 1 })),

  tickTelemetry: () =>
    set((s) => ({
      aiNodes: s.aiNodes.map((n) =>
        n.status === "offline" ? n : {
          ...n,
          gpuUtil: Math.round(jitter(n.gpuUtil, 6, 30, 95)),
          temp: Math.round(jitter(n.temp, 1.5, 50, 85)),
          latencyMs: Math.round(jitter(n.latencyMs, 4, 18, 90)),
          fps: Math.round(jitter(n.fps, 4, 40, 250)),
          inferenceQps: Math.round(jitter(n.inferenceQps, 12, 40, 450)),
        }
      ),
      gpuAvg: Math.round(jitter(s.gpuAvg, 4, 35, 90)),
      latencyMs: Math.round(jitter(s.latencyMs, 3, 22, 75)),
      inferenceQps: Math.round(jitter(s.inferenceQps, 25, 800, 1600)),
      env: {
        ...s.env,
        tempC: Math.round(jitter(s.env.tempC, 0.4, 28, 42)),
        humidity: Math.round(jitter(s.env.humidity, 1, 35, 80)),
        windKph: Math.round(jitter(s.env.windKph, 1, 2, 28)),
        aqi: Math.round(jitter(s.env.aqi, 4, 80, 220)),
        noiseDb: Math.round(jitter(s.env.noiseDb, 2, 70, 105)),
      },
      plantRiskScore: Math.round(jitter(s.plantRiskScore, 1.2, 45, 82)),
    })),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  setCopilotOpen: (v) => set({ copilotOpen: v }),

  setCamerasOnline: (online, total) =>
    set({ camerasOnline: online, camerasTotal: total }),
}));
