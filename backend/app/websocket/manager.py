"""
SafeVision AI — WebSocket Connection Manager
Manages all active WebSocket connections and broadcasts real-time events.
"""

from fastapi import WebSocket
from typing import List, Dict
import json
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        # All active connections
        self.active_connections: List[WebSocket] = []
        # Connection metadata — who is connected
        self.connection_info: Dict[WebSocket, dict] = {}

    # ── Connect / Disconnect ───────────────────────────────────────────────────
    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = {
            "client_id": client_id or "anonymous",
            "connected_at": datetime.now().isoformat()
        }
        print(f"✅ WS Connected  : {client_id} | Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        info = self.connection_info.pop(websocket, {})
        print(f"❌ WS Disconnected: {info.get('client_id')} | Total: {len(self.active_connections)}")

    # ── Broadcast to all ───────────────────────────────────────────────────────
    async def broadcast(self, message: dict):
        """Send message to ALL connected clients"""
        if not self.active_connections:
            return
        data = json.dumps(message)
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    # ── Violation Alert ────────────────────────────────────────────────────────
    async def send_violation_alert(
        self,
        violation_type: str,
        camera_name: str,
        zone: str,
        confidence: float,
        severity: str,
        snapshot_path: str = None,
        violation_id: int = None,
        alert_id: int = None,
    ):
        """
        Broadcast violation alert to all connected dashboards.
        Frontend listens for type='violation_alert'
        """
        await self.broadcast({
            "type":           "violation_alert",
            "violation_id":   violation_id,
            "alert_id":       alert_id,
            "violation_type": violation_type,
            "camera_name":    camera_name,
            "zone":           zone,
            "confidence":     round(confidence, 4),
            "severity":       severity,
            "snapshot_path":  snapshot_path,
            "timestamp":      datetime.now().isoformat(),
        })
        print(f"📡 WS Broadcast: {violation_type} | {camera_name} | {len(self.active_connections)} clients")

    # ── Camera Status ──────────────────────────────────────────────────────────
    async def send_camera_status(
        self,
        camera_id: str,
        camera_name: str,
        status: str,        # "online" | "offline" | "degraded"
        is_ai_active: bool = True,
    ):
        """
        Broadcast camera status change.
        Frontend listens for type='camera_status'
        """
        await self.broadcast({
            "type":         "camera_status",
            "camera_id":    camera_id,
            "camera_name":  camera_name,
            "status":       status,
            "is_ai_active": is_ai_active,
            "timestamp":    datetime.now().isoformat(),
        })

    # ── Dashboard Stats ────────────────────────────────────────────────────────
    async def send_dashboard_update(self, stats: dict):
        """
        Broadcast dashboard KPI update.
        Frontend listens for type='dashboard_update'
        """
        await self.broadcast({
            "type":      "dashboard_update",
            "stats":     stats,
            "timestamp": datetime.now().isoformat(),
        })

    # ── Pipeline Status ────────────────────────────────────────────────────────
    async def send_pipeline_status(self, camera_name: str, status: str, fps: float = 0):
        """
        Broadcast AI pipeline status.
        Frontend listens for type='pipeline_status'
        """
        await self.broadcast({
            "type":        "pipeline_status",
            "camera_name": camera_name,
            "status":      status,   # "running" | "stopped" | "error"
            "fps":         fps,
            "timestamp":   datetime.now().isoformat(),
        })

    # ── Utils ──────────────────────────────────────────────────────────────────
    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    def get_connections_info(self) -> list:
        return [
            {
                "client_id":    info["client_id"],
                "connected_at": info["connected_at"],
            }
            for info in self.connection_info.values()
        ]


# ── Singleton instance ─────────────────────────────────────────────────────────
manager = ConnectionManager()
