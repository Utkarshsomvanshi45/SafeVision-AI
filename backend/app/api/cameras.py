from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import Camera
import cv2
import asyncio

router = APIRouter()

# ── MJPEG async stream from pipeline's shared frame buffer ───────────────────
async def _mjpeg_stream(camera_name: str):
    from app.ai.pipeline import latest_frames, _frame_lock
    last_frame_id = None
    while True:
        with _frame_lock:
            frame = latest_frames.get(camera_name)

        if frame is None:
            await asyncio.sleep(0.1)
            continue

        frame_id = id(frame)
        if frame_id == last_frame_id:
            await asyncio.sleep(0.033)
            continue
        last_frame_id = frame_id

        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
        await asyncio.sleep(0.033)  # ~30fps

@router.get("/stream/{camera_id}")
async def stream_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        _mjpeg_stream(camera.name),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
 
@router.get("/")
def get_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()
 
@router.get("/{camera_id}")
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera
 
@router.put("/{camera_id}")
def update_camera(camera_id: str, data: dict, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    for key, value in data.items():
        setattr(camera, key, value)
    db.commit()
    db.refresh(camera)
    return camera
 
@router.post("/")
def add_camera(data: dict, db: Session = Depends(get_db)):
    camera = Camera(**data)
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera
 
@router.delete("/{camera_id}")
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted"}