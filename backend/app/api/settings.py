from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import AppSettings, DetectionModule
 
router = APIRouter()
 
@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(AppSettings).all()
    return {s.key: s.value for s in settings}
 
@router.put("/")
def update_settings(data: dict, db: Session = Depends(get_db)):
    for key, value in data.items():
        setting = db.query(AppSettings).filter(AppSettings.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            db.add(AppSettings(key=key, value=str(value)))
    db.commit()
    return {"message": "Settings saved"}
 
@router.get("/detection-modules")
def get_detection_modules(db: Session = Depends(get_db)):
    return db.query(DetectionModule).all()
 
@router.put("/detection-modules")
def update_detection_modules(data: list, db: Session = Depends(get_db)):
    for item in data:
        module = db.query(DetectionModule).filter(
            DetectionModule.violation_type == item["violation_type"]
        ).first()
        if module:
            module.is_enabled = item.get("is_enabled", True)
            module.sensitivity = item.get("sensitivity", 0.82)
    db.commit()
    return {"message": "Detection modules updated"}
 
@router.patch("/detection-modules/{violation_type}")
def toggle_detection_module(violation_type: str, data: dict, db: Session = Depends(get_db)):
    module = db.query(DetectionModule).filter(
        DetectionModule.violation_type == violation_type
    ).first()
    if not module:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Module not found")
    module.is_enabled = data.get("is_enabled", module.is_enabled)
    module.sensitivity = data.get("sensitivity", module.sensitivity)
    db.commit()
    db.refresh(module)
    return module

@router.post("/test-alert")
def send_test_alert(db: Session = Depends(get_db)):
    """Send a test violation email to all enabled recipients."""
    try:
        from app.alerts.email_sender import send_violation_email
        result = send_violation_email(
            violation_type="Test Alert — SafeVision AI",
            camera_name="BC_Load Area",
            zone="BC Load Area Zone",
            confidence=0.95,
            severity="high",
            snapshot_path=None
        )
        if result:
            return {"message": "Test alert sent successfully"}
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="Email sending failed — check email config in .env")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))