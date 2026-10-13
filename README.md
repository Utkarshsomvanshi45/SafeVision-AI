<div align="center">

<img src="frontend/src/assets/SafeVisionLogo.svg" alt="SafeVision AI logo" width="80" />

# SafeVision AI

### Real-time PPE compliance monitoring from CCTV, with live alerts and a full safety dashboard

Built during my industrial internship at AM/NS India (Talegaon Plant) · currently in final testing

[![Live Demo](https://img.shields.io/badge/Live_Demo-safevision--ai--app.vercel.app-0EA5E9?style=for-the-badge)](https://safevision-ai-app.vercel.app/)

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![YOLO](https://img.shields.io/badge/YOLOv11m-Custom_Trained-EF4444?style=flat-square)](https://ultralytics.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## Overview

SafeVision AI is a full-stack industrial safety platform. It uses computer vision on plant CCTV streams to detect PPE violations (missing helmet, missing safety vest, unauthorized zone entry), then logs each violation with an annotated snapshot, raises a real-time alert on the dashboard, and emails safety officers.

I built it end to end during my May to July 2026 internship at AM/NS India (Talegaon, Pune): the detection pipeline, the backend, and the web dashboard. It is designed for continuous operation, and detection pipelines start automatically when the backend launches. It is currently in final testing.

## Live Demo

**https://safevision-ai-app.vercel.app/**

The hosted demo lets you explore the dashboard, alerts, compliance review, analytics, and settings. Live camera inference needs RTSP or webcam access and dedicated compute, so it runs on-premises rather than in the hosted demo.

<!-- Add screenshots, then uncomment this block:
## Screenshots
| Dashboard | Live Monitoring |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Live](docs/screenshots/live.png) |
| Alerts | Compliance Review |
| ![Alerts](docs/screenshots/alerts.png) | ![Compliance](docs/screenshots/compliance.png) |
-->

---

## Features

**Live monitoring**
- Real-time MJPEG video from plant cameras in the browser, with a multi-camera grid (2x2 or 3x3) and an expand view
- RTSP support for IP cameras, and USB webcam support for testing
- Camera status indicators (Online, Offline, Degraded)

**AI detection pipeline**
- Dual-model design: YOLOv8s for person detection, and a custom-trained YOLOv11m for PPE detection (helmet, vest)
- Temporal consistency: a violation is confirmed only after 10 consecutive frames, which cuts false positives
- 60-second debounce per person per violation type
- One pipeline thread per camera, running inside the FastAPI process
- Per-module on/off switches and confidence thresholds, configurable from the dashboard

**Alerts and violations**
- Real-time WebSocket broadcasts to all connected dashboards
- Each violation is stored with snapshot, confidence, severity, zone, and shift
- Alert workflow: new, acknowledged, resolved, with bulk resolve, assignment, and notes
- CSV export of alert history
- Email alerts with an HTML template and the annotated snapshot attached

**Compliance review**
- Snapshot review queue with Accept, Reject, and Revert
- Filters by date, camera, and violation type
- Annotated images with bounding boxes, confidence scores, and timestamps

**Analytics and reports**
- Overall and per-type PPE compliance rate, 7-day trends, and an hourly violation heatmap
- Six report types: Daily Summary, Weekly, Monthly, Safety Audit, Camera Performance, AI Model Performance
- Export as HTML (print to PDF) or CSV

**Users and settings**
- Invite-only accounts with auto-generated temporary passwords and a forced password change on first login
- Role-based access: Admin, Safety Officer, Operator
- JWT authentication with bcrypt password hashing
- Camera management, an SVG floor plan with draggable zones, notification recipients per severity

---

## How It Works

```
CCTV / Webcam
      |
  pipeline.py (one thread per camera)
      |
  YOLOv8s  -> detect persons
      |
  YOLOv11m -> detect helmet / vest on each person
      |
  10-frame streak -> confirmed violation
      |
  +----------------------------------+
  |  Save violation to DB            |
  |  Create alert                    |
  |  Save compliance snapshot        |
  |  Save annotated .jpg             |
  |  Send HTML email with snapshot   |
  |  Broadcast WebSocket event       |
  +----------------------------------+
      |
  Dashboard updates live
```

---

## Model Performance

The PPE model (`best.pt`) is a YOLOv11m trained on a merged set of public Roboflow datasets (helmet and vest), with augmentation for industrial conditions (low light, blur, occlusion). Training ran on Google Colab (T4 GPU).

| Metric | Result |
|---|---|
| mAP50 | up to 97% |
| Average precision and recall | 95%+ |

These are validation results on the merged public dataset. Performance on live plant cameras is being checked during final testing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, TanStack Router, Shadcn UI |
| Backend | FastAPI, SQLAlchemy, PostgreSQL (SQLite for development) |
| AI models | YOLOv11m (custom PPE model), YOLOv8s (person detection) |
| Computer vision | OpenCV, Ultralytics |
| Real time | WebSocket (singleton pattern), MJPEG streaming |
| Auth | JWT, bcrypt |
| Email | Gmail SMTP with HTML templates |

---

## Project Structure

```
SafeVision-AI/
├── backend/
│   ├── app/
│   │   ├── ai/pipeline.py        # Detection pipeline (core)
│   │   ├── alerts/               # HTML email alerts and invite emails
│   │   ├── api/                  # Routes: alerts, cameras, compliance, dashboard,
│   │   │                         #   recipients, settings, violations, websocket
│   │   ├── auth/                 # JWT handling, dependencies, routes
│   │   ├── core/config.py
│   │   ├── database/             # Engine, session, init_db
│   │   ├── models/               # SQLAlchemy models + model weights
│   │   ├── schemas/  services/  utils/  websocket/
│   │   └── main.py               # FastAPI entry point, pipeline auto-start
│   ├── snapshots/                # Violation snapshots (served as static files)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/           # AI copilot, app shell, sidebar, topbar
        ├── hooks/useWebSocket.ts # Singleton WebSocket
        ├── lib/api.ts            # API client
        └── routes/               # dashboard, live, alerts, compliance, ppe,
                                  #   zones, analytics, incidents, reports, settings
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/invite` | Invite a user (sends email) |
| GET | `/api/dashboard/overview` | KPIs and recent violations |
| GET | `/api/cameras/` | All cameras |
| GET | `/api/cameras/stream/{id}` | MJPEG live stream |
| GET | `/api/violations/stats` | PPE compliance stats |
| GET | `/api/violations/range` | Historical data (7 or 30 days) |
| GET | `/api/alerts/` | Alerts with filters |
| PATCH | `/api/alerts/resolve-all` | Bulk resolve |
| GET | `/api/compliance/` | Snapshot review queue |
| DELETE | `/api/compliance/{id}` | Delete a snapshot |
| GET | `/api/settings/detection-modules` | AI module configuration |
| PATCH | `/api/settings/detection-modules/{type}` | Toggle a detection module |


### WebSocket events

```javascript
{ type: "violation_alert",  violation_type, camera_name, zone, confidence, severity, snapshot_path }
{ type: "camera_status",    camera_id, camera_name, status }
{ type: "dashboard_update", stats }
{ type: "pipeline_status",  camera_name, status, fps }
```

---

## Known Limitations

- The PPE model is trained on public datasets. Its accuracy on live plant footage is still being validated in final testing.
- Real-time inference speed depends on hardware; a GPU is recommended for many simultaneous cameras.
- The hosted demo does not run live camera inference (see Live Demo above).
- Violation snapshots accumulate on disk and need periodic cleanup or archival.

---

## Author

**Utkarsh Somvanshi**
B.Tech Computer Science Engineering (AI), Vijaybhoomi University
Industrial internship at AM/NS India, Talegaon (Pune), May to July 2026

[Portfolio](https://utkarshsomvanshi.vercel.app) · [LinkedIn](https://www.linkedin.com/in/utkarsh-somvanshi-b4837132b) · [GitHub](https://github.com/Utkarshsomvanshi45)

<div align="center">

*Because every worker deserves to go home safe.*

</div>
