"""
SafeVision AI — Detection Pipeline v3
2-Model: yolov8s (person) + best.pt (helmet/vest)
Temporal consistency: 15 consecutive frames = confirmed violation
"""

import cv2
import time
import json
import argparse
from datetime import datetime
from pathlib import Path
import sys
import asyncio
import threading

# ── Global frame buffer (shared with stream endpoint) ─────────────────────────
latest_frames: dict = {}   # camera_name -> latest annotated frame
_frame_lock = threading.Lock()

sys.path.append(str(Path(__file__).parent.parent.parent))

from app.websocket.manager import manager
from app.core.config import settings
from app.database.database import SessionLocal
from app.models.models import Violation, Alert, DetectionModule
from app.alerts.email_sender import send_violation_email

# ── Constants ──────────────────────────────────────────────────────────────────
DEBOUNCE_SECONDS   = 60     # Min gap between same violation alerts
OVERLAP_THRESH     = 0.25   # PPE box must be 30% inside person box
PERSON_CONF       = 0.45   # Confidence thoda upar
MIN_PERSON_HEIGHT = 120    # Height kam se kam 120px — half body minimum
MIN_PERSON_WIDTH  = 40     # Width bhi check karo — hand thin hota hai
MIN_ASPECT_RATIO  = 1.5   # yolov8s person confidence
PPE_CONF           = 0.12   # Our model PPE confidence (low = catch more)
STREAK_THRESHOLD   = 10     # 15 consecutive frames without PPE = violation
                            # At 5fps = 3 seconds confirmed


class SafeVisionPipeline:
    def __init__(self, source, camera_name="BC_Load Area", zone="BC Load Area Zone"):
        self.source          = source
        self.camera_name     = camera_name
        self.zone            = zone
        self.model           = None   # PPE model (helmet + vest)
        self.person_model    = None   # Person model (yolov8s)
        self.cap             = None
        self.frame_count     = 0
        self.last_alert_time = {}
        self.enabled_modules = {}

        # Temporal consistency streaks
        self.no_helmet_streak = 0
        self.no_vest_streak   = 0

        # Store last known violating person bbox for snapshot
        self.last_no_helmet_bbox  = None
        self.last_no_helmet_conf  = 0.0
        self.last_no_vest_bbox    = None
        self.last_no_vest_conf    = 0.0

        Path("snapshots").mkdir(exist_ok=True)

    # ── Model loading ──────────────────────────────────────────────────────────
    def load_model(self):
        from ultralytics import YOLO

        ppe_path = settings.MODEL_PATH
        if not Path(ppe_path).exists():
            print(f"❌ PPE model not found: {ppe_path}")
            return False
        self.model = YOLO(ppe_path)
        print(f"✅ PPE model    : {ppe_path}")
        print(f"   Classes      : {self.model.names}")

        person_path = settings.PERSON_MODEL_PATH
        if not Path(person_path).exists():
            print(f"❌ Person model not found: {person_path}")
            return False
        self.person_model = YOLO(person_path)
        print(f"✅ Person model : {person_path}")
        return True

    # ── Detection modules ──────────────────────────────────────────────────────
    def load_enabled_modules(self):
        db = SessionLocal()
        try:
            modules = db.query(DetectionModule).all()
            self.enabled_modules = {m.violation_type: m.is_enabled for m in modules}
        finally:
            db.close()

    def is_enabled(self, violation_type: str) -> bool:
        return self.enabled_modules.get(violation_type, True)

    # ── Shift ──────────────────────────────────────────────────────────────────
    def get_current_shift(self) -> str:
        hour = datetime.now().hour
        if 6 <= hour < 14:    return "A"
        elif 14 <= hour < 22: return "B"
        else:                 return "C"

    # ── Debounce ───────────────────────────────────────────────────────────────
    def is_debounced(self, key: str) -> bool:
        last = self.last_alert_time.get(key)
        if last is None: return False
        return (time.time() - last) < DEBOUNCE_SECONDS

    # ── Overlap ratio ──────────────────────────────────────────────────────────
    def _overlap_ratio(self, person_box: list, ppe_box: list) -> float:
        """
        PPE box ka kitna % person box ke andar hai.
        IoU nahi — kyunki person box bada hota hai.
        """
        x1    = max(person_box[0], ppe_box[0])
        y1    = max(person_box[1], ppe_box[1])
        x2    = min(person_box[2], ppe_box[2])
        y2    = min(person_box[3], ppe_box[3])
        inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        if inter == 0: return 0.0
        ppe_area = (ppe_box[2]-ppe_box[0]) * (ppe_box[3]-ppe_box[1])
        return inter / (ppe_area + 1e-6)

    # ── DB logging ─────────────────────────────────────────────────────────────
    def log_violation(self, violation_type, confidence, severity,
                      snapshot_path=None, bbox=None):
        db = SessionLocal()
        try:
            from app.models.models import Violation, Alert, ComplianceSnapshot
            from app.api.alerts import generate_alert_code

            v = Violation(
                violation_type = violation_type,
                camera_id      = self.camera_name.replace(" ", "_").upper(),
                camera_name    = self.camera_name,
                zone           = self.zone,
                confidence     = confidence,
                severity       = severity,
                bbox           = json.dumps(bbox) if bbox else None,
                snapshot_path  = snapshot_path,
                shift          = self.get_current_shift(),
                is_email_sent  = False
            )
            db.add(v)

            a = Alert(
                alert_code     = generate_alert_code(),
                violation_type = violation_type,
                camera_name    = self.camera_name,
                zone           = self.zone,
                confidence     = confidence,
                severity       = severity,
                status         = "new",
                snapshot_path  = snapshot_path
            )
            db.add(a)

            # ComplianceSnapshot — for Compliance Review page
            import random
            snap_code = f"S-{random.randint(100,999)}"
            cs = ComplianceSnapshot(
                snapshot_code  = snap_code,
                violation_type = violation_type,
                camera_name    = self.camera_name,
                zone           = self.zone,
                confidence     = confidence,
                status         = "pending",
                snapshot_path  = snapshot_path,
            )
            db.add(cs)

            db.commit()
            print(f"✅ Logged: {violation_type} ({confidence:.1%})")
        except Exception as e:
            print(f"❌ DB error: {e}")
            db.rollback()
        finally:
            db.close()

            asyncio.run(manager.send_violation_alert(
                violation_type = violation_type,
                camera_name    = self.camera_name,
                zone           = self.zone,
                confidence     = confidence,
                severity       = severity,
                snapshot_path  = snapshot_path,
            ))

    # ── Annotated snapshot ─────────────────────────────────────────────────────
    def save_annotated_snapshot(self, frame, violation_type: str,
                                 person_bbox: list, helmets: list,
                                 vests: list, confidence: float) -> str:
        """
        Save snapshot with:
        - Red box + label on violating person
        - Green boxes on detected PPE (what IS present)
        - Timestamp watermark
        """
        annotated = frame.copy()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        key       = violation_type.replace(" ", "_").lower()
        filename  = f"snapshots/POV_{key}_{timestamp}.jpg"

        # Green boxes — PPE that IS detected
        for (hbbox, hconf) in helmets:
            x1,y1,x2,y2 = map(int, hbbox)
            cv2.rectangle(annotated, (x1,y1), (x2,y2), (0, 200, 80), 2)
            label = f"Helmet {hconf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, y1-th-8), (x1+tw+6, y1), (0, 200, 80), -1)
            cv2.putText(annotated, label, (x1+3, y1-4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)

        for (vbbox, vconf) in vests:
            x1,y1,x2,y2 = map(int, vbbox)
            cv2.rectangle(annotated, (x1,y1), (x2,y2), (0, 160, 255), 2)
            label = f"Vest {vconf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, y1-th-8), (x1+tw+6, y1), (0, 160, 255), -1)
            cv2.putText(annotated, label, (x1+3, y1-4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)

        # Red box — violating person
        px1,py1,px2,py2 = map(int, person_bbox)
        cv2.rectangle(annotated, (px1,py1), (px2,py2), (0, 0, 220), 3)

        # Red label on person box
        label = f"{violation_type}  {confidence:.0%}"
        font  = cv2.FONT_HERSHEY_SIMPLEX
        (tw, th), _ = cv2.getTextSize(label, font, 0.6, 1)
        cv2.rectangle(annotated, (px1, py1-th-10), (px1+tw+8, py1), (0, 0, 220), -1)
        cv2.putText(annotated, label, (px1+4, py1-5),
                    font, 0.6, (255, 255, 255), 1, cv2.LINE_AA)

        # Timestamp watermark
        ts = f"SafeVision AI  {self.camera_name}  {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        cv2.putText(annotated, ts, (10, annotated.shape[0]-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1, cv2.LINE_AA)

        cv2.imwrite(filename, annotated)
        return filename

    # ── Core frame processor ───────────────────────────────────────────────────
    def process_frame(self, frame):
        """
        2-Model pipeline with temporal consistency:
        1. yolov8s  → detect persons
        2. best.pt  → detect helmets + vests
        3. Greedy 1-to-1 assignment
        4. Count consecutive frames without PPE → alert only after STREAK_THRESHOLD
        """

        # ── Step 1: Detect persons ─────────────────────────────────────────
        p_results = self.person_model(
            frame, classes=[0], conf=PERSON_CONF, verbose=False
        )
        persons = []
        if p_results[0].boxes is not None:
            for box in p_results[0].boxes:
                bbox = box.xyxy[0].tolist()
                h = bbox[3] - bbox[1]
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                aspect_ratio = h / (w + 1e-6)

                if h < MIN_PERSON_HEIGHT:
                    continue          # Too short — not a real person
                if w < MIN_PERSON_WIDTH:
                    continue          # Too thin — hand/arm
                if aspect_ratio < MIN_ASPECT_RATIO:
                    continue        
                persons.append((bbox, float(box.conf[0])))

        # No persons → reset streaks, no violation possible
        if not persons:
            self.no_helmet_streak = 0
            self.no_vest_streak   = 0
            return frame

        # ── Step 2: Detect PPE ─────────────────────────────────────────────
        ppe_results = self.model(frame, conf=PPE_CONF, verbose=False)
        helmets, vests = [], []
        if ppe_results[0].boxes is not None:
            for box in ppe_results[0].boxes:
                cls_name = self.model.names[int(box.cls[0])]
                bbox     = box.xyxy[0].tolist()
                conf     = float(box.conf[0])
                if cls_name == 'helmet': helmets.append((bbox, conf))
                elif cls_name == 'vest': vests.append((bbox, conf))

        # ── Step 3: Greedy 1-to-1 assignment ──────────────────────────────
        avail_helmets = list(range(len(helmets)))
        avail_vests   = list(range(len(vests)))

        any_no_helmet = False
        any_no_vest   = False

        for (pbbox, pconf) in persons:

            # Helmet assignment
            best_h_ratio, best_h_idx = 0.0, -1
            for i in avail_helmets:
                r = self._overlap_ratio(pbbox, helmets[i][0])
                if r > best_h_ratio:
                    best_h_ratio, best_h_idx = r, i

            has_helmet = best_h_ratio > OVERLAP_THRESH
            if has_helmet:
                avail_helmets.remove(best_h_idx)
            else:
                any_no_helmet = True
                self.last_no_helmet_bbox = pbbox
                self.last_no_helmet_conf = pconf

            # Vest assignment
            best_v_ratio, best_v_idx = 0.0, -1
            for i in avail_vests:
                r = self._overlap_ratio(pbbox, vests[i][0])
                if r > best_v_ratio:
                    best_v_ratio, best_v_idx = r, i

            has_vest = best_v_ratio > OVERLAP_THRESH
            if has_vest:
                avail_vests.remove(best_v_idx)
            else:
                any_no_vest = True
                self.last_no_vest_bbox = pbbox
                self.last_no_vest_conf = pconf

        # ── Step 4: Streak update ──────────────────────────────────────────
        if any_no_helmet:
            self.no_helmet_streak += 1
        else:
            self.no_helmet_streak = 0  # Reset — helmet found this frame

        if any_no_vest:
            self.no_vest_streak += 1
        else:
            self.no_vest_streak = 0    # Reset — vest found this frame

        # ── Step 5: Alert only when streak threshold crossed ───────────────
        if (self.no_helmet_streak >= STREAK_THRESHOLD and
                self.is_enabled('Helmet Not Worn') and
                not self.is_debounced('no_helmet') and
                self.last_no_helmet_bbox is not None):

            self.last_alert_time['no_helmet'] = time.time()
            self.no_helmet_streak = 0

            snap = self.save_annotated_snapshot(
                frame, 'Helmet Not Worn',
                self.last_no_helmet_bbox,
                helmets, vests,
                self.last_no_helmet_conf
            )
            self.log_violation('Helmet Not Worn',
                               self.last_no_helmet_conf, 'high', snap,
                               self.last_no_helmet_bbox)
            send_violation_email('Helmet Not Worn', self.camera_name,
                                 self.zone, self.last_no_helmet_conf,
                                 'high', snap)
            print(f"🚨 Helmet Not Worn | {self.last_no_helmet_conf:.1%} "
                  f"| {STREAK_THRESHOLD} frames confirmed | {self.camera_name}")

        if (self.no_vest_streak >= STREAK_THRESHOLD and
                self.is_enabled('Safety Jacket Missing') and
                not self.is_debounced('no_vest') and
                self.last_no_vest_bbox is not None):

            self.last_alert_time['no_vest'] = time.time()
            self.no_vest_streak = 0

            snap = self.save_annotated_snapshot(
                frame, 'Safety Jacket Missing',
                self.last_no_vest_bbox,
                helmets, vests,
                self.last_no_vest_conf
            )
            self.log_violation('Safety Jacket Missing',
                               self.last_no_vest_conf, 'high', snap,
                               self.last_no_vest_bbox)
            send_violation_email('Safety Jacket Missing', self.camera_name,
                                 self.zone, self.last_no_vest_conf,
                                 'high', snap)
            print(f"🚨 Safety Jacket Missing | {self.last_no_vest_conf:.1%} "
                  f"| {STREAK_THRESHOLD} frames confirmed | {self.camera_name}")

        # Return annotated frame
        annotated = ppe_results[0].plot()
        return annotated

    # ── Main run loop ──────────────────────────────────────────────────────────
    def run(self):
        if not self.load_model():
            return
        self.load_enabled_modules()

        # Handle webcam index — DB mein "0" ya "1" string hoti hai
        source = int(self.source) if str(self.source).isdigit() else self.source
        self.cap = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            print(f"❌ Cannot open: {self.source}")
            return

        print(f"\n✅ SafeVision AI Pipeline v3 Started")
        print(f"   Camera          : {self.camera_name}")
        print(f"   Zone            : {self.zone}")
        print(f"   Source          : {self.source} {'(webcam)' if str(self.source).isdigit() else '(stream)'}")
        print(f"   PPE conf        : {PPE_CONF}")
        print(f"   Person conf     : {PERSON_CONF}")
        print(f"   Streak threshold: {STREAK_THRESHOLD} frames")
        print(f"   Debounce        : {DEBOUNCE_SECONDS}s")
        print(f"   Press Q to quit\n")

        process_every = 5  # AI every 5th frame (~5fps)

        while self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                print("End of video / stream lost")
                break

            self.frame_count += 1

            if self.frame_count % process_every == 0:
                annotated = self.process_frame(frame)
            else:
                annotated = frame

            # Share latest frame with stream endpoint (same process memory)
            with _frame_lock:
                latest_frames[self.camera_name] = annotated.copy()

            # Reload enabled modules every 30 frames
            if self.frame_count % 30 == 0:
                self.load_enabled_modules()

        self.cap.release()
        print(f"\n✅ Pipeline stopped: {self.camera_name}")


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="SafeVision AI Pipeline v3")
    parser.add_argument("--source", default="0",
                        help="Video path / 0 for webcam / rtsp://...")
    parser.add_argument("--camera", default="BC_Load Area")
    parser.add_argument("--zone",   default="BC Load Area Zone")
    args = parser.parse_args()
    source = int(args.source) if args.source.isdigit() else args.source
    SafeVisionPipeline(source, args.camera, args.zone).run()


if __name__ == "__main__":
    main()