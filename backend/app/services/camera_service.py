# app/services/camera_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Camera, Violation
from datetime import datetime, date
from typing import Optional


def get_all(db: Session) -> list:
    return db.query(Camera).all()


def get_by_id(db: Session, camera_id: str) -> Optional[Camera]:
    return db.query(Camera).filter(Camera.camera_id == camera_id).first()


def create(db: Session, data: dict) -> Camera:
    camera = Camera(**data)
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def update(db: Session, camera_id: str, data: dict) -> Optional[Camera]:
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        return None
    for key, value in data.items():
        setattr(camera, key, value)
    db.commit()
    db.refresh(camera)
    return camera


def delete(db: Session, camera_id: str) -> bool:
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        return False
    db.delete(camera)
    db.commit()
    return True


def update_status(db: Session, camera_id: str, status: str):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if camera:
        camera.status = status
        camera.last_seen = datetime.utcnow()
        db.commit()


def get_health_summary(db: Session) -> dict:
    total = db.query(Camera).count()
    online = db.query(Camera).filter(Camera.status == "online").count()
    offline = db.query(Camera).filter(Camera.status == "offline").count()
    degraded = db.query(Camera).filter(Camera.status == "degraded").count()
    return {
        "total": total,
        "online": online,
        "offline": offline,
        "degraded": degraded
    }


def get_violations_today(db: Session, camera_name: str) -> int:
    return db.query(Violation).filter(
        Violation.camera_name == camera_name,
        func.date(Violation.detected_at) == date.today()
    ).count()
