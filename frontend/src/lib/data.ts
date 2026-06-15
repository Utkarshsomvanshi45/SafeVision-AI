// SafeVision AI by AMNS - shared data & types
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "Open" | "In Progress" | "Resolved" | "Acknowledged" | "Escalated" | "False Positive" | "Closed";
export type CameraStatus = "online" | "offline" | "degraded";

export interface Camera {
  id: string;
  name: string;
  location: string;
  zone: string;
  department: "IRONMAKING" | "STEELMAKING" | "LOGISTICS" | "MAINTENANCE";
  status: CameraStatus;
  resolution: string;
  fps: number;
  ip: string;
  lastEvent?: string;
  scene?: "rolling_mill" | "blast_furnace" | "scrap_yard" | "caster" | "gate" | "perimeter" | "lab" | "coke" | "sinter";
}

export interface ViolationType {
  key: string;
  label: string;
  severity: Severity;
  color: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  zone: string;
  type: string;
  severity: Severity;
  confidence: number;
  status: AlertStatus;
  assigned: string;
  isNew?: boolean;
  aiReasoning?: string;
  responseTimeSec?: number;
}

export const CAMERAS: Camera[] = [
  { id: "CAM-001", name: "BC_Load Area", location: "BC Loading Platform", zone: "BC Load Area Zone", department: "IRONMAKING", status: "online", resolution: "1080p", fps: 24, ip: "192.168.10.11", lastEvent: "4m ago", scene: "blast_furnace" },
  { id: "CAM-002", name: "CRNCTL-CRNCTL", location: "CRNCTL Control Bay", zone: "CRNCTL Zone", department: "STEELMAKING", status: "online", resolution: "1080p", fps: 24, ip: "192.168.10.12", lastEvent: "12m ago", scene: "caster" },
  { id: "CAM-003", name: "Scrap Yard", location: "Main Scrap Yard", zone: "Scrap Yard Zone", department: "LOGISTICS", status: "online", resolution: "720p", fps: 15, ip: "192.168.10.13", lastEvent: "2m ago", scene: "scrap_yard" },
  { id: "CAM-004", name: "HR Slitting", location: "HR Slitting Line", zone: "HR Slitting Zone", department: "STEELMAKING", status: "online", resolution: "1080p", fps: 30, ip: "192.168.10.14", lastEvent: "6m ago", scene: "rolling_mill" },
  { id: "CAM-005", name: "Main Security Gate", location: "Plant Entry & Exit", zone: "Security Gate Zone", department: "LOGISTICS", status: "online", resolution: "1080p", fps: 24, ip: "192.168.10.15", lastEvent: "1m ago", scene: "gate" },
  { id: "CAM-006", name: "Weight Bridge", location: "Truck Weight Bridge", zone: "Weight Bridge Zone", department: "LOGISTICS", status: "online", resolution: "1080p", fps: 24, ip: "192.168.10.16", lastEvent: "9m ago", scene: "perimeter" },
  { id: "CAM-007", name: "Trap Area", location: "Trap Area Corridor", zone: "Trap Area Zone", department: "MAINTENANCE", status: "online", resolution: "720p", fps: 15, ip: "192.168.10.17", lastEvent: "22m ago", scene: "lab" },
  { id: "CAM-008", name: "Coke Oven Bank A", location: "Coke Oven Battery A", zone: "Coke Oven Battery", department: "IRONMAKING", status: "offline", resolution: "—", fps: 0, ip: "192.168.10.18", lastEvent: "2h ago", scene: "coke" },
  { id: "CAM-009", name: "Sinter Plant Gate", location: "Sinter Plant Entry", zone: "Sinter Plant", department: "IRONMAKING", status: "degraded", resolution: "480p", fps: 8, ip: "192.168.10.19", lastEvent: "18m ago", scene: "sinter" },
];

export const VIOLATION_TYPES: ViolationType[] = [
  { key: "helmet", label: "Helmet Not Worn", severity: "High", color: "#E1261C" },
  { key: "jacket", label: "Safety Jacket Missing", severity: "High", color: "#EA580C" },
  { key: "zone", label: "Restricted Zone Entry", severity: "Critical", color: "#E1261C" },
  { key: "height", label: "Work at Height", severity: "Critical", color: "#E1261C" },
  { key: "equipment", label: "Person Near Equipment", severity: "High", color: "#EA580C" },
  { key: "edge", label: "Floor Edge Violation", severity: "High", color: "#D97706" },
  { key: "gloves", label: "Gloves Not Worn", severity: "Medium", color: "#D97706" },
  { key: "harness", label: "Harness Missing", severity: "Critical", color: "#E1261C" },
  { key: "crowd", label: "Crowd Density Alert", severity: "Medium", color: "#D97706" },
  { key: "unauthorized", label: "Unauthorized Entry", severity: "Critical", color: "#E1261C" },
  { key: "truck", label: "Unsafe Truck Loading", severity: "High", color: "#EA580C" },
  { key: "boots", label: "Safety Boots Missing", severity: "Low", color: "#16A34A" },
];

export const ALERTS: Alert[] = [
  { id: "ALT-20240516-0047", timestamp: "14:32:11", cameraId: "CAM-001", cameraName: "BC_Load Area", zone: "BC Load Area Zone", type: "Helmet Not Worn", severity: "High", confidence: 91.4, status: "Open", assigned: "Unassigned", aiReasoning: "Pose estimation detected exposed head region. No helmet contour matched within 0.83 IoU threshold across 14 consecutive frames." },
  { id: "ALT-20240516-0046", timestamp: "14:29:03", cameraId: "CAM-004", cameraName: "HR Slitting", zone: "HR Slitting Zone", type: "Work at Height", severity: "Critical", confidence: 88.7, status: "In Progress", assigned: "R. Sharma", aiReasoning: "Worker detected 3.2m above floor reference plane on catwalk segment B-4 without visible harness anchor." },
  { id: "ALT-20240516-0045", timestamp: "14:18:55", cameraId: "CAM-003", cameraName: "Scrap Yard", zone: "Scrap Yard Zone", type: "Safety Jacket Missing", severity: "High", confidence: 86.2, status: "Open", assigned: "Unassigned", aiReasoning: "High-vis chromatic signature absent from torso ROI; ambient lighting normal." },
  { id: "ALT-20240516-0044", timestamp: "14:05:22", cameraId: "CAM-006", cameraName: "Weight Bridge", zone: "Weight Bridge Zone", type: "Unsafe Truck Loading", severity: "Critical", confidence: 95.1, status: "Resolved", assigned: "A. Patel", aiReasoning: "Truck departed weighing platform with insecure load profile detected by silhouette delta." },
  { id: "ALT-20240516-0043", timestamp: "13:47:09", cameraId: "CAM-005", cameraName: "Main Security Gate", zone: "Security Gate Zone", type: "Gloves Not Worn", severity: "Medium", confidence: 78.3, status: "Resolved", assigned: "M. Khan", aiReasoning: "Hand region classifier confidence below 80% threshold; flagged for review." },
  { id: "ALT-20240516-0042", timestamp: "13:31:44", cameraId: "CAM-001", cameraName: "BC_Load Area", zone: "BC Load Area Zone", type: "Person Near Equipment", severity: "High", confidence: 89.6, status: "Resolved", assigned: "R. Sharma", aiReasoning: "Worker entered 1.5m proximity radius of charging car CC-2 during active cycle." },
  { id: "ALT-20240516-0041", timestamp: "13:14:33", cameraId: "CAM-002", cameraName: "CRNCTL-CRNCTL", zone: "CRNCTL Zone", type: "Floor Edge Violation", severity: "High", confidence: 83.4, status: "Resolved", assigned: "A. Patel", aiReasoning: "Foot placement detected within 0.4m of platform edge marker." },
  { id: "ALT-20240516-0040", timestamp: "12:58:17", cameraId: "CAM-004", cameraName: "HR Slitting", zone: "HR Slitting Zone", type: "Helmet Not Worn", severity: "High", confidence: 92.1, status: "Resolved", assigned: "S. Verma" },
  { id: "ALT-20240516-0039", timestamp: "12:44:02", cameraId: "CAM-003", cameraName: "Scrap Yard", zone: "Scrap Yard Zone", type: "Crowd Density Alert", severity: "Medium", confidence: 81.7, status: "Resolved", assigned: "M. Khan", aiReasoning: "12 workers in 28m² zone, exceeding 0.4/m² threshold." },
  { id: "ALT-20240516-0038", timestamp: "12:29:51", cameraId: "CAM-006", cameraName: "Weight Bridge", zone: "Weight Bridge Zone", type: "Unauthorized Entry", severity: "Critical", confidence: 97.3, status: "Resolved", assigned: "R. Sharma", aiReasoning: "Badge re-identification failed; appearance signature not in authorized cluster." },
];

export const ZONES = [
  { name: "BC Load Area Zone", risk: "HIGH", workers: 4, alerts: 2 },
  { name: "HR Slitting Zone", risk: "HIGH", workers: 7, alerts: 0 },
  { name: "Scrap Yard Zone", risk: "MEDIUM", workers: 12, alerts: 1 },
  { name: "CRNCTL Zone", risk: "MEDIUM", workers: 5, alerts: 0 },
  { name: "Weight Bridge Zone", risk: "MEDIUM", workers: 3, alerts: 1 },
  { name: "Security Gate Zone", risk: "LOW", workers: 3, alerts: 0 },
  { name: "Trap Area Zone", risk: "LOW", workers: 2, alerts: 0 },
] as const;

export const USERS = [
  { initials: "RS", name: "Rajesh Sharma", email: "r.sharma@amns.in", role: "Safety Officer", dept: "Safety & HSE", lastLogin: "2m ago", status: "Active" },
  { initials: "AP", name: "Ankit Patel", email: "a.patel@amns.in", role: "Plant Head", dept: "Operations", lastLogin: "12m ago", status: "Active" },
  { initials: "MK", name: "Meera Khan", email: "m.khan@amns.in", role: "Safety Officer", dept: "Safety & HSE", lastLogin: "1h ago", status: "Active" },
  { initials: "SV", name: "Suresh Verma", email: "s.verma@amns.in", role: "Security Operator", dept: "Security", lastLogin: "3h ago", status: "Active" },
  { initials: "NK", name: "Neha Kulkarni", email: "n.kulkarni@amns.in", role: "AI Engineer", dept: "IT & Digital", lastLogin: "8m ago", status: "Active" },
  { initials: "DR", name: "Deepak Rao", email: "d.rao@amns.in", role: "Compliance Auditor", dept: "Compliance", lastLogin: "Yesterday", status: "Active" },
  { initials: "AU", name: "Admin User", email: "admin@amns.in", role: "System Admin", dept: "IT & Digital", lastLogin: "Yesterday", status: "Active" },
];

export const PPE_TYPES = [
  { key: "helmet", label: "Helmet", compliance: 91.2, violations: 9, trend: "up" },
  { key: "jacket", label: "Safety Jacket", compliance: 86.7, violations: 14, trend: "flat" },
  { key: "gloves", label: "Gloves", compliance: 78.4, violations: 22, trend: "down" },
  { key: "mask", label: "Mask", compliance: 95.1, violations: 5, trend: "up" },
  { key: "boots", label: "Boots", compliance: 97.3, violations: 3, trend: "up" },
  { key: "harness", label: "Harness", compliance: 99.1, violations: 1, trend: "up" },
] as const;

// === New enterprise datasets ===

export interface AINode {
  id: string;
  label: string;
  region: string;
  gpu: string;
  gpuUtil: number;
  temp: number;
  latencyMs: number;
  fps: number;
  status: "online" | "degraded" | "offline";
  modelVersion: string;
  inferenceQps: number;
}

export const AI_NODES: AINode[] = [
  { id: "edge-01", label: "Edge Node BF-01", region: "Ironmaking Edge", gpu: "NVIDIA T4 (16GB)", gpuUtil: 68, temp: 71, latencyMs: 38, fps: 91, status: "online", modelVersion: "yolov8-safety/v2.1.3", inferenceQps: 124 },
  { id: "edge-02", label: "Edge Node SM-02", region: "Steelmaking Edge", gpu: "NVIDIA T4 (16GB)", gpuUtil: 74, temp: 73, latencyMs: 41, fps: 88, status: "online", modelVersion: "yolov8-safety/v2.1.3", inferenceQps: 132 },
  { id: "edge-03", label: "Edge Node LG-03", region: "Logistics Edge", gpu: "NVIDIA Jetson Orin", gpuUtil: 52, temp: 64, latencyMs: 49, fps: 72, status: "online", modelVersion: "yolov8-safety/v2.1.3", inferenceQps: 84 },
  { id: "edge-04", label: "Edge Node IM-04", region: "Coke Battery Edge", gpu: "NVIDIA Jetson Orin", gpuUtil: 81, temp: 79, latencyMs: 62, fps: 58, status: "degraded", modelVersion: "yolov8-safety/v2.1.2", inferenceQps: 64 },
  { id: "core-01", label: "Core Inference A100-01", region: "Data Center / Pune", gpu: "NVIDIA A100 (80GB)", gpuUtil: 47, temp: 58, latencyMs: 22, fps: 240, status: "online", modelVersion: "yolov8-safety/v2.1.3", inferenceQps: 412 },
  { id: "core-02", label: "Core Inference A100-02", region: "Data Center / Pune", gpu: "NVIDIA A100 (80GB)", gpuUtil: 54, temp: 60, latencyMs: 24, fps: 232, status: "online", modelVersion: "yolov8-safety/v2.1.3", inferenceQps: 397 },
];

export const MODEL_REGISTRY = [
  { name: "yolov8-safety", version: "v2.1.3", status: "production", deployed: "May 14, 09:12", mAP: 0.873, precision: 0.891, recall: 0.856, drift: 0.04 },
  { name: "yolov8-safety", version: "v2.1.2", status: "rollback", deployed: "May 02, 14:30", mAP: 0.864, precision: 0.882, recall: 0.851, drift: 0.06 },
  { name: "yolov8-ppe-aux", version: "v1.4.0", status: "shadow", deployed: "May 12, 11:45", mAP: 0.811, precision: 0.844, recall: 0.792, drift: 0.09 },
  { name: "pose-est-hrnet", version: "v1.0.7", status: "production", deployed: "Apr 28, 08:00", mAP: 0.832, precision: 0.858, recall: 0.819, drift: 0.03 },
];

export interface AIInsight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  category: "pattern" | "anomaly" | "forecast" | "recommendation";
}

export const AI_INSIGHTS: AIInsight[] = [
  { id: "I-01", title: "Cluster detected · Blast Furnace", body: "5 PPE violations detected in Blast Furnace zone within last 20 min. Suggest dispatch of HSE walk-through.", severity: "critical", category: "pattern" },
  { id: "I-02", title: "Compliance drift · Shift B", body: "Helmet compliance in Shift B trending −4.2% over 7 days. Recommend toolbox talk for crew B-3.", severity: "warning", category: "forecast" },
  { id: "I-03", title: "Coverage gap · Sinter Plant", body: "CAM-009 degraded for 18 min. Effective blind spot ≈ 38m² between BF-East and Sinter entry.", severity: "warning", category: "anomaly" },
  { id: "I-04", title: "Forecast · Scrap Yard", body: "Predicted crowd density +22% during 14:00 shift handover. Recommend staggered movement.", severity: "info", category: "forecast" },
  { id: "I-05", title: "Recurring offender", body: "Worker ID-417 implicated in 4 helmet violations over 7 days across 3 cameras.", severity: "warning", category: "pattern" },
];

export const OPERATORS_ONLINE = [
  { initials: "RS", name: "R. Sharma", role: "Safety Officer", since: "06:02" },
  { initials: "AP", name: "A. Patel", role: "Plant Head", since: "07:15" },
  { initials: "MK", name: "M. Khan", role: "Safety Officer", since: "06:00" },
  { initials: "SV", name: "S. Verma", role: "Security Op", since: "06:00" },
  { initials: "NK", name: "N. Kulkarni", role: "AI Engineer", since: "08:30" },
];

export const AUDIT_LOG = [
  { time: "14:32:11", user: "r.sharma", action: "alert.acknowledge", target: "ALT-20240516-0046", channel: "web" },
  { time: "14:31:02", user: "system", action: "alert.create", target: "ALT-20240516-0047", channel: "ai" },
  { time: "14:29:47", user: "a.patel", action: "alert.escalate", target: "ALT-20240516-0046", channel: "web" },
  { time: "14:24:18", user: "n.kulkarni", action: "model.deploy", target: "yolov8-safety/v2.1.3", channel: "cli" },
  { time: "14:18:55", user: "system", action: "alert.create", target: "ALT-20240516-0045", channel: "ai" },
  { time: "14:12:01", user: "m.khan", action: "report.generate", target: "Daily Safety / May 15", channel: "web" },
  { time: "13:58:30", user: "system", action: "camera.degraded", target: "CAM-009", channel: "monitor" },
  { time: "13:47:09", user: "m.khan", action: "alert.resolve", target: "ALT-20240516-0043", channel: "mobile" },
  { time: "13:32:44", user: "r.sharma", action: "zone.update", target: "BF-EX-02 polygon", channel: "web" },
  { time: "13:14:33", user: "system", action: "alert.create", target: "ALT-20240516-0041", channel: "ai" },
];

export const ESCALATION_CHAIN = [
  { tier: 0, label: "AI Auto-detect", who: "SafeVision Engine", color: "#2563EB" },
  { tier: 1, label: "Operator notified", who: "Control Room", color: "#0891B2" },
  { tier: 2, label: "Safety Officer", who: "HSE on-shift", color: "#D97706" },
  { tier: 3, label: "Plant Head", who: "Operations Lead", color: "#EA580C" },
  { tier: 4, label: "Executive Bridge", who: "VP Safety + Plant Director", color: "#E1261C" },
];

export const ENV_SENSORS = { tempC: 34, humidity: 58, windKph: 12, aqi: 142, noiseDb: 88 };

export function severityColor(s: Severity): string {
  return s === "Critical" ? "#E1261C" : s === "High" ? "#EA580C" : s === "Medium" ? "#D97706" : "#16A34A";
}

export function statusColor(s: AlertStatus): string {
  if (s === "Open" || s === "Escalated") return "#E1261C";
  if (s === "In Progress" || s === "Acknowledged") return "#D97706";
  if (s === "False Positive") return "#6B7280";
  return "#16A34A";
}
