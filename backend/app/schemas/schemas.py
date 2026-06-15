# app/schemas/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Violation ─────────────────────────────────────────────────────────────────
class ViolationCreate(BaseModel):
    violation_type: str
    camera_id: str
    camera_name: str
    zone: Optional[str] = None
    confidence: float
    severity: str = "high"
    bbox: Optional[str] = None
    snapshot_path: Optional[str] = None
    shift: Optional[str] = None

class ViolationResponse(BaseModel):
    id: int
    violation_type: str
    camera_name: str
    zone: Optional[str]
    confidence: float
    severity: str
    snapshot_path: Optional[str]
    detected_at: Optional[datetime]
    class Config:
        from_attributes = True


# ── Alert ─────────────────────────────────────────────────────────────────────
class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class AlertResponse(BaseModel):
    id: int
    alert_code: str
    violation_type: str
    camera_name: str
    zone: Optional[str]
    confidence: float
    severity: str
    status: str
    assigned_to: Optional[str]
    notes: Optional[str]
    snapshot_path: Optional[str]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True


# ── Camera ────────────────────────────────────────────────────────────────────
class CameraCreate(BaseModel):
    camera_id: str
    name: str
    location: Optional[str] = None
    zone: Optional[str] = None
    rtsp_url: Optional[str] = None
    resolution: str = "1080p"
    fps: int = 24

class CameraResponse(BaseModel):
    id: int
    camera_id: str
    name: str
    location: Optional[str]
    zone: Optional[str]
    status: str
    resolution: str
    fps: int
    is_ai_active: bool
    class Config:
        from_attributes = True


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    employee_id: Optional[str] = None
    role: str = "operator"
    department: Optional[str] = None
    password: str


# ── Detection Module ──────────────────────────────────────────────────────────
class DetectionModuleUpdate(BaseModel):
    violation_type: str
    is_enabled: bool
    sensitivity: float


# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardOverview(BaseModel):
    total_violations_today: int
    active_alerts: int
    cameras_online: int
    cameras_total: int
    compliance_rate: float
