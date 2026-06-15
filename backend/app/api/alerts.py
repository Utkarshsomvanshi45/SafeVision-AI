from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.database import get_db
from app.models.models import Alert
from typing import Optional
from datetime import datetime, date
import random, string
 
router = APIRouter()
 
def generate_alert_code():
    today = date.today().strftime("%Y%m%d")
    rand = ''.join(random.choices(string.digits, k=4))
    return f"ALT-{today}-{rand}"
 
@router.get("/")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    camera_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if camera_name:
        query = query.filter(Alert.camera_name == camera_name)
    return query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
 
@router.get("/stats")
def get_alert_stats(db: Session = Depends(get_db)):
    today = date.today()
    from sqlalchemy import func
    total = db.query(Alert).filter(func.date(Alert.created_at) == today).count()
    open_count = db.query(Alert).filter(Alert.status == "new").count()
    resolved = db.query(Alert).filter(
        Alert.status == "resolved",
        func.date(Alert.created_at) == today
    ).count()
    in_progress = db.query(Alert).filter(Alert.status == "in_progress").count()
    return {
        "total_today": total,
        "open": open_count,
        "resolved_today": resolved,
        "in_progress": in_progress
    }
 
@router.patch("/{alert_id}")
def update_alert(alert_id: int, data: dict, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    for key, value in data.items():
        setattr(alert, key, value)
    if data.get("status") == "resolved":
        alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
 
@router.post("/")
def create_alert(data: dict, db: Session = Depends(get_db)):
    data["alert_code"] = generate_alert_code()
    alert = Alert(**data)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
 
@router.patch("/resolve-all")
def resolve_all_alerts(db: Session = Depends(get_db)):
    db.query(Alert).filter(Alert.status == "new").update({"status": "resolved", "resolved_at": datetime.utcnow()})
    db.commit()
    return {"message": "All alerts resolved"}
 