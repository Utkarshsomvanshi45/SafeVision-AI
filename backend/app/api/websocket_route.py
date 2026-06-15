"""
SafeVision AI — WebSocket Route
Frontend connects to ws://localhost:8000/ws
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str = Query(default="dashboard"),
):
    """
    WebSocket endpoint.
    
    Frontend connect karo:
      const ws = new WebSocket('ws://localhost:8000/ws?client_id=dashboard')
    
    Message types frontend ko milenge:
      - violation_alert   → naya violation detected
      - camera_status     → camera online/offline
      - dashboard_update  → KPI stats update
      - pipeline_status   → AI pipeline running/stopped
      - ping              → keep-alive
    """
    await manager.connect(websocket, client_id)

    # Send welcome message
    await websocket.send_json({
        "type":    "connected",
        "message": f"SafeVision AI WebSocket connected",
        "client_id": client_id,
        "active_connections": manager.connection_count,
    })

    try:
        while True:
            # Frontend se message receive karo
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            # Ping → Pong (keep-alive)
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            # Frontend koi command bhej sakta hai
            elif msg_type == "subscribe":
                await websocket.send_json({
                    "type":    "subscribed",
                    "channel": data.get("channel", "all"),
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)

    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)


@router.get("/ws/status")
async def websocket_status():
    """Check how many clients are connected"""
    return {
        "active_connections": manager.connection_count,
        "connections":        manager.get_connections_info(),
    }
