<div align="center">

<img src="frontend/src/assets/SafeVisionLogo.svg" alt="SafeVision AI Logo" width="80" />

# SafeVision AI

### AI-Powered Industrial Safety Monitoring System

**Built for AM/NS India (ArcelorMittal Nippon Steel) — Talegaon Plant**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![YOLOv11](https://img.shields.io/badge/YOLOv11m-Custom%20Trained-EF4444?style=flat-square)](https://ultralytics.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

---

*Replacing DARSA AI — the plant's existing vendor safety monitoring system*

</div>

---

## What is SafeVision AI?

SafeVision AI is a real-time industrial safety monitoring platform that uses computer vision to detect PPE (Personal Protective Equipment) violations across plant CCTV cameras. The system monitors workers for helmet usage, safety jacket compliance, and unauthorized zone entries — raising instant alerts and sending email notifications to safety officers.

Built end-to-end as a 45-day internship project at AM/NS India, Talegaon (Pune), it is designed to run 24×7 with zero manual intervention once deployed.

---

## Features

### 🎥 Live Monitoring
- Real-time MJPEG video feed from all plant cameras in browser
- Multi-camera grid view (2×2 or 3×3 layout) with expand modal
- RTSP stream support for industrial IP cameras
- USB webcam support for testing (`rtsp_url = "0"`)
- Live status indicators — Online / Offline / Degraded
- Pipeline auto-starts on backend launch — no manual intervention needed

### 🤖 AI Detection Pipeline
- **Dual-model architecture:**
  - `YOLOv8s` — person detection with spatial filtering
  - `YOLOv11m` (custom trained) — PPE detection (helmet, safety vest)
- Temporal consistency — 10 consecutive frames = confirmed violation (eliminates false positives)
- 60-second debounce per person per violation type
- Per-camera pipeline threads running inside FastAPI process
- Detection module toggles — enable/disable specific violation types from dashboard
- Configurable confidence thresholds per module

### 🚨 Alerts & Violations
- Real-time WebSocket broadcasts to all connected dashboard clients
- Violation logged to DB with snapshot, confidence, severity, zone, shift
- Alert created simultaneously with status tracking (new → acknowledged → resolved)
- Bulk resolve, assign to operator, add notes
- CSV export of alert history
- Email alerts with HTML template + annotated snapshot attachment

### 📋 Compliance Review
- Snapshot review queue — Accept / Reject / Revert
- Date, camera, violation type filters
- Delete snapshots to manage storage
- Real annotated images with bounding boxes, confidence scores, timestamp

### 📊 Analytics & Reports
- PPE compliance rate (overall + per type)
- 7-day trend charts, hourly violation heatmap
- 6 report types: Daily Summary, Weekly, Monthly, Safety Audit, Camera Performance, AI Model Performance
- Download as HTML (→ Ctrl+P → PDF) or CSV

### 👥 User Management
- Invite-only user creation (no public signup)
- Auto-generated temp passwords sent via email
- Must-change-password flow on first login
- Role-based access: Admin, Safety Officer, Operator
- JWT authentication with bcrypt password hashing

### ⚙️ Settings & Control
- Camera Management — add/edit/delete/toggle cameras
- Zone Control — SVG floor plan with drag-to-move and resize zones
- AI Configuration — toggle detection modules, set sensitivity
- Notification Recipients — add/remove email recipients per alert severity
- Security — password change with strength indicator

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + TanStack Router + Shadcn UI |
| Backend | FastAPI + SQLAlchemy + PostgreSQL / SQLite |
| AI Models | YOLOv11m (custom) + YOLOv8s (person detection) |
| Real-time | WebSocket (singleton pattern) + MJPEG stream |
| Auth | JWT + bcrypt |
| Email | Gmail SMTP + HTML templates |
| CV | OpenCV + Ultralytics YOLO |

---

## Project Structure

```
SafeVision-AI/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   └── pipeline.py          # Detection pipeline — CORE
│   │   ├── alerts/
│   │   │   └── email_sender.py      # HTML email alerts + invite emails
│   │   ├── api/
│   │   │   ├── alerts.py
│   │   │   ├── cameras.py           # + MJPEG stream endpoint
│   │   │   ├── compliance.py
│   │   │   ├── dashboard.py
│   │   │   ├── recipients.py
│   │   │   ├── settings.py
│   │   │   ├── violations.py
│   │   │   └── websocket_route.py
│   │   ├── auth/
│   │   │   ├── dependencies.py
│   │   │   ├── jwt_handler.py
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── database/
│   │   │   ├── database.py
│   │   │   └── init_db.py
│   │   ├── models/
│   │   │   ├── models.py            # All SQLAlchemy models
│   │   │   ├── best.pt              # Custom YOLOv11m model
│   │   │   └── yolov8s.pt           # Person detection model
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── websocket/
│   │   │   └── manager.py
│   │   └── main.py                  # FastAPI entry point + pipeline auto-start
│   ├── snapshots/                   # Violation snapshots (served as static files)
│   ├── .env
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/
        │   ├── ai/AICopilot.tsx
        │   └── shell/               # AppShell, Sidebar, Topbar
        ├── hooks/
        │   └── useWebSocket.ts      # Singleton WebSocket
        ├── lib/
        │   └── api.ts               # All API calls
        └── routes/
            ├── dashboard.tsx
            ├── live.tsx             # Real MJPEG camera feed
            ├── alerts.tsx
            ├── compliance.tsx
            ├── ppe.tsx
            ├── zones.tsx
            ├── analytics.tsx
            ├── incidents.tsx
            ├── reports.tsx
            └── settings.tsx
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or SQLite for dev)
- CUDA GPU (optional, CPU works for testing)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/your-username/SafeVision-AI.git
cd SafeVision-AI/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DB URL, JWT secret, Gmail credentials

# Start backend (pipelines auto-start for all online cameras)
uvicorn app.main:app --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:8080
```

### Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost/safevision
SECRET_KEY=your-jwt-secret-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
ALERT_FROM_EMAIL=safevision@yourplant.com
```

---

## How It Works

```
CCTV / Webcam
      ↓
  pipeline.py (per camera thread)
      ↓
  YOLOv8s → detect persons
      ↓
  YOLOv11m → detect helmet/vest on each person
      ↓
  10 frame streak → confirmed violation
      ↓
  ┌──────────────────────────────────┐
  │  Save Violation to DB            │
  │  Create Alert in DB              │
  │  Save ComplianceSnapshot to DB   │
  │  Save annotated .jpg snapshot    │
  │  Send HTML email with snapshot   │
  │  Broadcast WebSocket alert       │
  └──────────────────────────────────┘
      ↓
  Browser Dashboard updates live
```

---

## Camera Setup

### Adding Real CCTV Cameras
1. Go to **Settings → Camera Management**
2. Click **Add Camera**
3. Enter RTSP URL: `rtsp://username:password@192.168.1.x:554/stream`
4. Backend restart → pipeline auto-starts for the new camera

### Testing with USB Webcam
```bash
# Run manually (webcam sources don't auto-start)
cd backend
python -m app.ai.pipeline --source 0 --camera "Webcam Test" --zone "Test Zone"
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/invite` | Invite user (sends email) |
| GET | `/api/dashboard/overview` | KPIs + recent violations |
| GET | `/api/cameras/` | All cameras |
| GET | `/api/cameras/stream/{id}` | MJPEG live stream |
| GET | `/api/violations/stats` | PPE compliance stats |
| GET | `/api/violations/range` | Historical data (7/30 days) |
| GET | `/api/alerts/` | All alerts with filters |
| PATCH | `/api/alerts/resolve-all` | Bulk resolve |
| GET | `/api/compliance/` | Snapshot review queue |
| DELETE | `/api/compliance/{id}` | Delete snapshot |
| GET | `/api/settings/detection-modules` | AI module config |
| PATCH | `/api/settings/detection-modules/{type}` | Toggle detection |

Full interactive docs: `http://localhost:8000/docs`

---

## Model Training

The PPE detection model (`best.pt`) was trained on a merged dataset from Roboflow:

- Multi-dataset merge (helmet + vest detection datasets)
- Industrial-condition augmentation (low light, blur, occlusion)
- Classes: `helmet`, `vest`
- Architecture: YOLOv11m
- Training: Google Colab (T4 GPU)

To retrain:
```bash
# See training notebook: notebooks/train_yolov11m.ipynb
```

---

## WebSocket Events

```javascript
// Frontend receives:
{ type: "violation_alert",  violation_type, camera_name, zone, confidence, severity, snapshot_path }
{ type: "camera_status",    camera_id, camera_name, status }
{ type: "dashboard_update", stats }
{ type: "pipeline_status",  camera_name, status, fps }
```

---

## Deployment Notes

- Run with `uvicorn app.main:app --port 8000` (no `--reload` in production)
- Pipelines auto-start for all non-offline cameras on startup
- Snapshots stored in `backend/snapshots/` — set up periodic cleanup or archival
- For production: use Nginx reverse proxy + SSL
- PM2 or systemd recommended for process management

---

## Built By

**Utkarsh Somvanshi**
2nd Year Computer Engineering Student
45-Day Industrial Internship — AM/NS India, Talegaon, Pune
June 2026

---

<div align="center">

*SafeVision AI — Because every worker deserves to go home safe.*

</div>