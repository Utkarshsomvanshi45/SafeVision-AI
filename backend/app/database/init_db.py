"""
Run this once to initialize the database with seed data.
python -m app.database.init_db
"""
from app.database.database import engine, SessionLocal, Base
from app.models.models import Camera, DetectionModule, AppSettings
from datetime import datetime


def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")

    db = SessionLocal()

    try:
        # ── Seed Cameras ──────────────────────────────────────────────────────
        if db.query(Camera).count() == 0:
            cameras = [
                Camera(camera_id="CAM-001", name="BC_Load Area",
                       location="Blast Furnace Loading Platform",
                       zone="BC Load Area Zone", status="online",
                       resolution="1080p", fps=24),
                Camera(camera_id="CAM-002", name="CRNCTL-CRNCTL",
                       location="CRNCTL Control Bay",
                       zone="CRNCTL Zone", status="online",
                       resolution="1080p", fps=24),
                Camera(camera_id="CAM-003", name="Scrap Yard",
                       location="Main Scrap Yard",
                       zone="Scrap Yard Zone", status="online",
                       resolution="720p", fps=15),
                Camera(camera_id="CAM-004", name="HR Slitting",
                       location="HR Slitting Line",
                       zone="HR Slitting Zone", status="online",
                       resolution="1080p", fps=30),
                Camera(camera_id="CAM-005", name="Main Security Gate",
                       location="Plant Entry & Exit",
                       zone="Security Gate Zone", status="online",
                       resolution="1080p", fps=24),
                Camera(camera_id="CAM-006", name="Weight Bridge",
                       location="Truck Weight Bridge",
                       zone="Weight Bridge Zone", status="online",
                       resolution="1080p", fps=24),
                Camera(camera_id="CAM-007", name="Trap Area",
                       location="Trap Area Corridor",
                       zone="Trap Area Zone", status="online",
                       resolution="720p", fps=15),
                Camera(camera_id="CAM-008", name="Coke Oven Bank A",
                       location="Coke Oven Battery A",
                       zone="Coke Oven Zone", status="offline",
                       resolution="1080p", fps=0),
                Camera(camera_id="CAM-009", name="Sinter Plant Gate",
                       location="Sinter Plant Entry",
                       zone="Sinter Zone", status="degraded",
                       resolution="480p", fps=8),
            ]
            db.add_all(cameras)
            db.commit()
            print("✅ Cameras seeded")

        # ── Seed Detection Modules ─────────────────────────────────────────────
        if db.query(DetectionModule).count() == 0:
            modules = [
                DetectionModule(violation_type="Helmet Not Worn",         is_enabled=True, sensitivity=0.85),
                DetectionModule(violation_type="Safety Jacket Missing",   is_enabled=True, sensitivity=0.82),
                DetectionModule(violation_type="Restricted Zone Entry",   is_enabled=True, sensitivity=0.92),
                DetectionModule(violation_type="Work at Height",          is_enabled=True, sensitivity=0.88),
                DetectionModule(violation_type="Person Near Equipment",   is_enabled=True, sensitivity=0.80),
                DetectionModule(violation_type="Floor Edge Violation",    is_enabled=True, sensitivity=0.78),
                DetectionModule(violation_type="Gloves Not Worn",         is_enabled=True, sensitivity=0.75),
                DetectionModule(violation_type="Harness Missing",         is_enabled=True, sensitivity=0.90),
                DetectionModule(violation_type="Crowd Density Alert",     is_enabled=True, sensitivity=0.70),
                DetectionModule(violation_type="Unauthorized Entry",      is_enabled=True, sensitivity=0.92),
                DetectionModule(violation_type="Unsafe Truck Loading",    is_enabled=True, sensitivity=0.80),
                DetectionModule(violation_type="Safety Boots Missing",    is_enabled=True, sensitivity=0.72),
            ]
            db.add_all(modules)
            db.commit()
            print("✅ Detection modules seeded")

        # ── Seed App Settings ──────────────────────────────────────────────────
        if db.query(AppSettings).count() == 0:
            app_settings = [
                AppSettings(key="plant_name",     value="Talegaon Plant"),
                AppSettings(key="timezone",       value="Asia/Kolkata (IST)"),
                AppSettings(key="shift_pattern",  value="06:00-14:00 / 14:00-22:00 / 22:00-06:00"),
                AppSettings(key="email_alerts",   value="true"),
                AppSettings(key="sms_alerts",     value="true"),
                AppSettings(key="whatsapp_alerts",value="true"),
                AppSettings(key="inference_fps",  value="5"),
                AppSettings(key="debounce_frames",value="15"),
                AppSettings(key="ai_master_enabled", value="true"),
            ]
            db.add_all(app_settings)
            db.commit()
            print("✅ App settings seeded")

        print("\n✅ Database initialization complete")
        print("📍 Run: uvicorn app.main:app --reload")

    finally:
        db.close()


if __name__ == "__main__":
    init_db()
