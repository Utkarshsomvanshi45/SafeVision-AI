# app/services/alert_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.models import Alert
from datetime import date, datetime
from typing import Optional
import random, string


def generate_code() -> str:
    today = date.today().strftime("%Y%m%d")
    rand = ''.join(random.choices(string.digits, k=4))
    return f"ALT-{today}-{rand}"


def get_all(db: Session, status=None, severity=None, camera_name=None, skip=0, limit=50):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if camera_name:
        query = query.filter(Alert.camera_name == camera_name)
    return query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()


def get_stats(db: Session) -> dict:
    today = date.today()
    total = db.query(Alert).filter(func.date(Alert.created_at) == today).count()
    open_count = db.query(Alert).filter(Alert.status.in_(["new", "acknowledged", "under_review", "escalated"])).count()
    resolved = db.query(Alert).filter(Alert.status == "resolved", func.date(Alert.created_at) == today).count()
    critical = db.query(Alert).filter(Alert.severity == "critical", Alert.status == "new").count()
    return {
        "total_today": total,
        "open": open_count,
        "resolved_today": resolved,
        "critical_unresolved": critical
    }


def create(db: Session, data: dict) -> Alert:
    data["alert_code"] = generate_code()
    alert = Alert(**data)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def update(db: Session, alert_id: int, data: dict) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    for key, value in data.items():
        setattr(alert, key, value)
    if data.get("status") == "resolved":
        alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


def resolve_all(db: Session) -> int:
    count = db.query(Alert).filter(Alert.status == "new").count()
    db.query(Alert).filter(Alert.status == "new").update({
        "status": "resolved",
        "resolved_at": datetime.utcnow()
    })
    db.commit()
    return count


def get_related(db: Session, camera_name: str, alert_id: int, minutes: int = 20) -> list:
    """Get related alerts from same camera in last N minutes"""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(minutes=minutes)
    return db.query(Alert).filter(
        Alert.camera_name == camera_name,
        Alert.id != alert_id,
        Alert.created_at >= cutoff
    ).order_by(desc(Alert.created_at)).limit(5).all()
