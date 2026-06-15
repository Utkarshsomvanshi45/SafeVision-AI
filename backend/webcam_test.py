
import cv2
from ultralytics import YOLO

# COCO model for Person
person_model = YOLO("app/models/yolov8s.pt")

# Your PPE model
ppe_model = YOLO("app/models/best.pt")

cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)  # USB webcam

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Person detection
    person_results = person_model(frame, classes=[0], conf=0.4)

    person_boxes = person_results[0].boxes

    annotated_frame = frame.copy()

    # Draw person boxes
    for box in person_boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        cv2.rectangle(
            annotated_frame,
            (x1, y1),
            (x2, y2),
            (255, 0, 0),
            2
        )

        cv2.putText(
            annotated_frame,
            "Person",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 0, 0),
            2
        )

    # PPE detect ONLY if person exists
    if len(person_boxes) > 0:

        ppe_results = ppe_model(frame, conf=0.6)

        for box in ppe_results[0].boxes:

            cls_id = int(box.cls[0])
            conf = float(box.conf[0])

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            label = ppe_model.names[cls_id]

            cv2.rectangle(
                annotated_frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            cv2.putText(
                annotated_frame,
                f"{label} {conf:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

    cv2.imshow("SafeVision Webcam Test", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()