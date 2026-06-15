from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading
from fastapi.staticfiles import StaticFiles
import os

from app.database.database import engine, Base
from app.api import violations, cameras, alerts, compliance, settings, dashboard, recipients
from app.core.config import settings as app_settings
from app.auth import routes as auth_routes
from app.api import websocket_route as ws_routes

# ── Pipeline threads registry ─────────────────────────────────────────────────
_pipeline_threads: list = []

def _start_pipelines():
    """Start one pipeline thread per active camera in DB."""
    import time
    time.sleep(2)  # Wait for DB to be ready
    from app.database.database import SessionLocal
    from app.models.models import Camera
    from app.ai.pipeline import SafeVisionPipeline

    db = SessionLocal()
    try:
        cameras_list = db.query(Camera).filter(Camera.status != "offline").all()
    finally:
        db.close()

    for cam in cameras_list:
        if not cam.rtsp_url:
            continue
        pipeline = SafeVisionPipeline(
            source      = cam.rtsp_url,
            camera_name = cam.name,
            zone        = cam.zone or "General Zone",
        )
        t = threading.Thread(target=pipeline.run, daemon=True, name=f"pipeline-{cam.name}")
        t.start()
        _pipeline_threads.append(t)
        print(f"🎥 Pipeline started: {cam.name} ({cam.rtsp_url})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    print("✅ SafeVision AI Backend Started")
    # Start pipelines in background — same process = shared latest_frames dict
    threading.Thread(target=_start_pipelines, daemon=True).start()
    yield
    print("SafeVision AI Backend Shutting Down")


app = FastAPI(
    title="SafeVision AI",
    description="AI-powered industrial safety monitoring system for AM/NS India",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allows React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(violations.router, prefix="/api/violations", tags=["Violations"])
app.include_router(cameras.router,    prefix="/api/cameras",    tags=["Cameras"])
app.include_router(alerts.router,     prefix="/api/alerts",     tags=["Alerts"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["Compliance"])
app.include_router(settings.router,   prefix="/api/settings",   tags=["Settings"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ws_routes.router, tags=["WebSocket"])
app.include_router(recipients.router, prefix="/api/settings/recipients", tags=["Recipients"])

_snap_dir = os.path.join(os.getcwd(), "snapshots")
os.makedirs(_snap_dir, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory=_snap_dir), name="snapshots")


@app.get("/")
def root():
    return {
        "message": "SafeVision AI Backend Running",
        "version": "1.0.0",
        "plant": "AM/NS India — Talegaon",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}