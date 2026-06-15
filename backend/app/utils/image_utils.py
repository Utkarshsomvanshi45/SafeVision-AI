import cv2
import os
from datetime import datetime
from pathlib import Path


def save_snapshot(frame, violation_type: str, camera_name: str) -> str:
    """Save violation frame as JPEG, return file path"""
    Path("snapshots").mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    clean_type = violation_type.replace(" ", "_").lower()
    clean_cam = camera_name.replace(" ", "_").lower()
    filename = f"snapshots/POV_{clean_type}_{clean_cam}_{timestamp}.jpg"
    cv2.imwrite(filename, frame)
    return filename


def draw_boxes(frame, boxes, class_names):
    """Draw bounding boxes on frame"""
    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = f"{class_names[cls_id]} {conf:.0%}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    return frame
