# app/services/violation_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.models import Violation
from datetime import date, datetime
from typing import Optional, List


def get_all(db: Session, skip=0, limit=50, camera_name=None, violation_type=None, severity=None):
    query = db.query(Violation)
    if camera_name:
        query = query.filter(Violation.camera_name == camera_name)
    if violation_type:
        query = query.filter(Violation.violation_type == violation_type)
    if severity:
        query = query.filter(Violation.severity == severity)
    return query.order_by(desc(Violation.detected_at)).offset(skip).limit(limit).all()


def get_today_count(db: Session) -> int:
    return db.query(Violation).filter(
        func.date(Violation.detected_at) == date.today()
    ).count()


def get_stats_today(db: Session) -> dict:
    today = date.today()
    total = db.query(Violation).filter(func.date(Violation.detected_at) == today).count()

    by_type = db.query(
        Violation.violation_type,
        func.count(Violation.id).label("count")
    ).filter(func.date(Violation.detected_at) == today).group_by(Violation.violation_type).all()

    by_camera = db.query(
        Violation.camera_name,
        func.count(Violation.id).label("count")
    ).filter(func.date(Violation.detected_at) == today).group_by(Violation.camera_name).all()

    by_severity = db.query(
        Violation.severity,
        func.count(Violation.id).label("count")
    ).filter(func.date(Violation.detected_at) == today).group_by(Violation.severity).all()

    return {
        "total_today": total,
        "by_type": [{"type": r[0], "count": r[1]} for r in by_type],
        "by_camera": [{"camera": r[0], "count": r[1]} for r in by_camera],
        "by_severity": [{"severity": r[0], "count": r[1]} for r in by_severity],
    }


def get_hourly_trend(db: Session) -> list:
    """Returns violation count per hour for today — for dashboard chart"""
    today = date.today()
    rows = db.query(
        func.extract('hour', Violation.detected_at).label("hour"),
        func.count(Violation.id).label("count")
    ).filter(
        func.date(Violation.detected_at) == today
    ).group_by("hour").order_by("hour").all()
    return [{"hour": int(r[0]), "count": r[1]} for r in rows]


def create(db: Session, data: dict) -> Violation:
    violation = Violation(**data)
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation


def get_shift_violations(db: Session, shift: str) -> int:
    return db.query(Violation).filter(
        Violation.shift == shift,
        func.date(Violation.detected_at) == date.today()
    ).count()
