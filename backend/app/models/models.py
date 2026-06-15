from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertStatus(str, enum.Enum):
    new = "new"
    acknowledged = "acknowledged"
    under_review = "under_review"
    escalated = "escalated"
    resolved = "resolved"
    false_positive = "false_positive"


class ComplianceStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class CameraStatus(str, enum.Enum):
    online = "online"
    offline = "offline"
    degraded = "degraded"


# ─── Violation ────────────────────────────────────────────────────────────────
class Violation(Base):
    __tablename__ = "violations"

    id            = Column(Integer, primary_key=True, index=True)
    violation_type = Column(String, nullable=False)        # "Safety Jacket Missing"
    camera_id     = Column(String, nullable=False)         # "CAM-001"
    camera_name   = Column(String, nullable=False)         # "BC_Load Area"
    zone          = Column(String, nullable=True)          # "BC Load Area Zone"
    confidence    = Column(Float, nullable=False)          # 0.914
    severity      = Column(String, default="high")
    bbox          = Column(String, nullable=True)          # "[x,y,w,h]" as JSON string
    snapshot_path = Column(String, nullable=True)          # path to POV image
    shift         = Column(String, nullable=True)          # "A", "B", "C"
    is_email_sent = Column(Boolean, default=False)
    detected_at   = Column(DateTime(timezone=True), server_default=func.now())


# ─── Alert ────────────────────────────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id             = Column(Integer, primary_key=True, index=True)
    alert_code     = Column(String, unique=True, index=True)  # "ALT-20240516-0047"
    violation_type = Column(String, nullable=False)
    camera_name    = Column(String, nullable=False)
    zone           = Column(String, nullable=True)
    confidence     = Column(Float, nullable=False)
    severity       = Column(String, default="high")
    status         = Column(String, default="new")
    assigned_to    = Column(String, nullable=True)
    notes          = Column(Text, nullable=True)
    snapshot_path  = Column(String, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at    = Column(DateTime(timezone=True), nullable=True)


# ─── Camera ───────────────────────────────────────────────────────────────────
class Camera(Base):
    __tablename__ = "cameras"

    id           = Column(Integer, primary_key=True, index=True)
    camera_id    = Column(String, unique=True, index=True)  # "CAM-001"
    name         = Column(String, nullable=False)           # "BC_Load Area"
    location     = Column(String, nullable=True)
    zone         = Column(String, nullable=True)
    rtsp_url     = Column(String, nullable=True)            # stored encrypted later
    status       = Column(String, default="online")
    resolution   = Column(String, default="1080p")
    fps          = Column(Integer, default=24)
    is_ai_active = Column(Boolean, default=True)
    last_seen    = Column(DateTime(timezone=True), server_default=func.now())
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


# ─── Compliance Snapshot ──────────────────────────────────────────────────────
class ComplianceSnapshot(Base):
    __tablename__ = "compliance_snapshots"

    id             = Column(Integer, primary_key=True, index=True)
    snapshot_code  = Column(String, unique=True, index=True)  # "S-901"
    violation_type = Column(String, nullable=False)
    camera_name    = Column(String, nullable=False)
    zone           = Column(String, nullable=True)
    confidence     = Column(Float, nullable=False)
    status         = Column(String, default="pending")  # pending/accepted/rejected
    snapshot_path  = Column(String, nullable=True)
    reviewed_by    = Column(String, nullable=True)
    captured_at    = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at    = Column(DateTime(timezone=True), nullable=True)


# ─── Detection Module Settings ─────────────────────────────────────────────────
class DetectionModule(Base):
    __tablename__ = "detection_modules"

    id             = Column(Integer, primary_key=True, index=True)
    violation_type = Column(String, unique=True, nullable=False)
    is_enabled     = Column(Boolean, default=True)
    sensitivity    = Column(Float, default=0.82)   # confidence threshold 0-1
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


# ─── User ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    email       = Column(String, unique=True, index=True, nullable=False)
    employee_id = Column(String, nullable=True)
    role        = Column(String, default="operator")
    department  = Column(String, nullable=True)
    is_active   = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=False)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    last_login          = Column(DateTime(timezone=True), nullable=True)
    must_change_password = Column(Boolean, default=False)


# ─── App Settings ─────────────────────────────────────────────────────────────
class AppSettings(Base):
    __tablename__ = "app_settings"

    id            = Column(Integer, primary_key=True, index=True)
    key           = Column(String, unique=True, nullable=False)
    value         = Column(Text, nullable=True)
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

class AlertRecipient(Base):
    __tablename__ = "alert_recipients"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, nullable=False)
    alert_type = Column(String, default="all")
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 
