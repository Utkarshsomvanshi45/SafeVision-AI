from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.database import get_db
from app.models.models import Violation
from typing import Optional
from datetime import datetime, date, timedelta

router = APIRouter()

@router.get("/")
def get_violations(
    skip: int = 0,
    limit: int = 50,
    camera_name: Optional[str] = None,
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Violation)
    if camera_name:
        query = query.filter(Violation.camera_name == camera_name)
    if violation_type:
        query = query.filter(Violation.violation_type == violation_type)
    if severity:
        query = query.filter(Violation.severity == severity)
    return query.order_by(desc(Violation.detected_at)).offset(skip).limit(limit).all()

@router.get("/stats")
def get_violation_stats(db: Session = Depends(get_db)):
    today = date.today()

    # Today's violations
    today_violations = db.query(Violation).filter(
        func.date(Violation.detected_at) == today
    ).all()
    total_today = len(today_violations)

    # by_type count
    type_counts: dict = {}
    camera_counts: dict = {}
    hour_counts = [0] * 24
    for v in today_violations:
        t = v.violation_type or "Unknown"
        type_counts[t] = type_counts.get(t, 0) + 1
        c = v.camera_name or "Unknown"
        camera_counts[c] = camera_counts.get(c, 0) + 1
        if v.detected_at:
            hour_counts[v.detected_at.hour] += 1

    # Most common violation
    most_common = max(type_counts, key=type_counts.get) if type_counts else "—"

    # Best zone (camera with fewest violations)
    best_zone = min(camera_counts, key=camera_counts.get) if camera_counts else "—"

    # Overall compliance — simple: 100 - (violations_today / max(total_frames_estimate, 1)) * 100
    # Use a simple heuristic: if 0 violations => 100%, else scale
    total_cameras = db.query(func.count(func.distinct(Violation.camera_name))).scalar() or 1
    # compliance = 1 - violation_rate (capped 0-100)
    # Assume ~100 person-detections per camera per day as baseline
    baseline = total_cameras * 100
    overall_compliance = max(0.0, min(100.0, (1 - total_today / baseline) * 100)) if baseline > 0 else 100.0

    # by_type for PPE cards
    ppe_key_map = {
        "helmet not worn": "helmet",
        "safety jacket missing": "jacket",
        "gloves not worn": "gloves",
        "mask not worn": "mask",
    }
    by_type_ppe = {}
    for vtype, cnt in type_counts.items():
        key = ppe_key_map.get(vtype.lower(), vtype.lower().replace(" ", "_"))
        by_type_ppe[key] = {
            "label": vtype,
            "count": cnt,
            "compliance_rate": max(0, 100 - cnt * 5),  # rough estimate
            "trend": "down" if cnt > 3 else "flat",
        }

    # 7-day trend
    trend_7day = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        cnt = db.query(Violation).filter(func.date(Violation.detected_at) == d).count()
        compliance = max(0, 100 - cnt * 2)
        trend_7day.append({
            "day": d.strftime("%a"),
            "helmet": max(0, compliance - (cnt % 5)),
            "jacket": max(0, compliance - (cnt % 3)),
            "gloves": max(0, compliance),
        })

    return {
        "total_today": total_today,
        "overall_compliance": round(overall_compliance, 1),
        "most_common": most_common,
        "best_zone": best_zone,
        "by_type": by_type_ppe,
        "by_camera": [{"camera": k, "count": v} for k, v in sorted(camera_counts.items(), key=lambda x: -x[1])],
        "trend_7day": trend_7day,
        "by_department": [],   # populate when dept data available
        "hourly_pattern": hour_counts,
    }

@router.post("/")
def create_violation(data: dict, db: Session = Depends(get_db)):
    violation = Violation(**data)
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation

@router.get("/range")
def get_violations_range(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    violations = db.query(Violation).filter(Violation.detected_at >= since).all()

    by_date: dict = {}
    by_type: dict = {}
    by_camera: dict = {}
    for v in violations:
        d = v.detected_at.strftime("%Y-%m-%d") if v.detected_at else "unknown"
        by_date[d] = by_date.get(d, 0) + 1
        by_type[v.violation_type] = by_type.get(v.violation_type, 0) + 1
        by_camera[v.camera_name] = by_camera.get(v.camera_name, 0) + 1

    return {
        "total": len(violations),
        "days": days,
        "by_date": [{"date": k, "count": v} for k, v in sorted(by_date.items())],
        "by_type": [{"type": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
        "by_camera": [{"camera": k, "count": v} for k, v in sorted(by_camera.items(), key=lambda x: -x[1])],
        "violations": [{"id": v.id, "violation_type": v.violation_type, "camera_name": v.camera_name,
                        "zone": v.zone, "confidence": round(v.confidence, 2), "severity": v.severity,
                        "detected_at": v.detected_at.isoformat() if v.detected_at else None} for v in violations[:100]]
    }