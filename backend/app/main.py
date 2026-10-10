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

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("Database tables created")
    print("SafeVision AI Backend Started")
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


# Vercel ASGI handler
handler = app