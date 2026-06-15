from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.database import get_db
from app.models.models import ComplianceSnapshot
from typing import Optional
from datetime import datetime, date

router = APIRouter()

@router.get("/stats")
def get_compliance_stats(db: Session = Depends(get_db)):
    today = date.today()
    from sqlalchemy import func
    total    = db.query(ComplianceSnapshot).filter(func.date(ComplianceSnapshot.captured_at) == today).count()
    pending  = db.query(ComplianceSnapshot).filter(ComplianceSnapshot.status == "pending").count()
    accepted = db.query(ComplianceSnapshot).filter(ComplianceSnapshot.status == "accepted").count()
    rejected = db.query(ComplianceSnapshot).filter(ComplianceSnapshot.status == "rejected").count()
    return {"total": total, "pending": pending, "accepted": accepted, "rejected": rejected}

@router.get("/")
def get_snapshots(
    status: Optional[str] = None,
    camera_name: Optional[str] = None,
    violation_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    query = db.query(ComplianceSnapshot)
    if status:
        query = query.filter(ComplianceSnapshot.status == status)
    if camera_name:
        query = query.filter(ComplianceSnapshot.camera_name == camera_name)
    if violation_type:
        query = query.filter(ComplianceSnapshot.violation_type == violation_type)
    return query.order_by(desc(ComplianceSnapshot.captured_at)).offset(skip).limit(limit).all()

@router.patch("/{snapshot_id}")
def update_snapshot(snapshot_id: int, data: dict, db: Session = Depends(get_db)):
    snapshot = db.query(ComplianceSnapshot).filter(ComplianceSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    for key, value in data.items():
        setattr(snapshot, key, value)
    snapshot.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(snapshot)
    return snapshot

@router.delete("/{snapshot_id}")
def delete_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    snapshot = db.query(ComplianceSnapshot).filter(ComplianceSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    db.delete(snapshot)
    db.commit()
    return {"message": "Snapshot deleted"}