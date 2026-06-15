# backend/app/api/recipients.py  ← NEW FILE
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import AlertRecipient
from app.auth.dependencies import get_current_user
from app.models.models import User

router = APIRouter()


@router.get("")
def list_recipients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipients = db.query(AlertRecipient).order_by(AlertRecipient.created_at).all()
    return [
        {
            "id":         r.id,
            "name":       r.name,
            "email":      r.email,
            "alert_type": r.alert_type,
            "is_enabled": r.is_enabled,
        }
        for r in recipients
    ]


@router.post("")
def add_recipient(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(AlertRecipient).filter(AlertRecipient.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in recipient list")

    r = AlertRecipient(
        name=data["name"],
        email=data["email"],
        alert_type=data.get("alert_type", "all"),
        is_enabled=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "name": r.name, "email": r.email, "alert_type": r.alert_type, "is_enabled": r.is_enabled}


@router.patch("/{recipient_id}")
def update_recipient(
    recipient_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(AlertRecipient).filter(AlertRecipient.id == recipient_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if "is_enabled" in data:
        r.is_enabled = data["is_enabled"]
    if "alert_type" in data:
        r.alert_type = data["alert_type"]
    if "name" in data:
        r.name = data["name"]
    db.commit()
    return {"message": "Updated", "id": r.id}


@router.delete("/{recipient_id}")
def delete_recipient(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(AlertRecipient).filter(AlertRecipient.id == recipient_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recipient not found")
    db.delete(r)
    db.commit()
    return {"message": f"{r.name} removed from recipients"}
