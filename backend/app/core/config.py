from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SafeVision AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite:///./safevision.db"

    # Security
    SECRET_KEY: str = "safevision-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Email
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = "sentinel@amns.in"
    ALERT_RECIPIENTS: str = "r.sharma@amns.in,a.patel@amns.in"

    # Plant
    PLANT_NAME: str = "Talegaon Plant"
    PLANT_TIMEZONE: str = "Asia/Kolkata"

    # AI Model
    # AI Model
    MODEL_PATH: str = "../assets/models/best.pt"
    CONFIDENCE_THRESHOLD: float = 0.20          
    PERSON_MODEL_PATH: str = "./app/models/yolov8n.pt"  
    DEBOUNCE_FRAMES: int = 15
    INFERENCE_FPS: int = 5

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def get_alert_recipients(self) -> List[str]:
        return [r.strip() for r in self.ALERT_RECIPIENTS.split(",") if r.strip()]


settings = Settings()
