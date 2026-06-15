from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.database import get_db
from app.models.models import Violation, Alert, Camera, ComplianceSnapshot
from datetime import date, datetime
 
router = APIRouter()
 
@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    today = date.today()
 
    # KPI counts
    total_violations_today = db.query(Violation).filter(
        func.date(Violation.detected_at) == today
    ).count()
 
    active_alerts = db.query(Alert).filter(
        Alert.status.in_(["new", "acknowledged", "under_review", "escalated"])
    ).count()
 
    cameras_online = db.query(Camera).filter(Camera.status == "online").count()
    cameras_total = db.query(Camera).count()
 
    # Compliance rate (simple calculation)
    compliance_rate = 87.3  # Will be calculated from real data later
 
    # Recent violations
    recent = db.query(Violation).order_by(
        desc(Violation.detected_at)
    ).limit(10).all()
 
    # By violation type today
    by_type = db.query(
        Violation.violation_type,
        func.count(Violation.id).label("count")
    ).filter(
        func.date(Violation.detected_at) == today
    ).group_by(Violation.violation_type).all()
 
    # Camera health
    cameras = db.query(Camera).all()
 
    return {
        "kpis": {
            "total_violations_today": total_violations_today,
            "active_alerts": active_alerts,
            "cameras_online": cameras_online,
            "cameras_total": cameras_total,
            "compliance_rate": compliance_rate,
        },
        "recent_violations": [
            {
                "id": v.id,
                "violation_type": v.violation_type,
                "camera_name": v.camera_name,
                "zone": v.zone,
                "confidence": round(v.confidence, 1),
                "severity": v.severity,
                "detected_at": v.detected_at.isoformat() if v.detected_at else None,
                "snapshot_path": v.snapshot_path
            } for v in recent
        ],
        "violations_by_type": [
            {"type": r[0], "count": r[1]} for r in by_type
        ],
        "cameras": [
            {
                "camera_id": c.camera_id,
                "name": c.name,
                "location": c.location,
                "status": c.status,
                "is_ai_active": c.is_ai_active
            } for c in cameras
        ]
    }
 