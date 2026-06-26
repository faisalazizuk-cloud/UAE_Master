from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./tradetracker.db"
    SECRET_KEY: str = "change-me-in-production-use-a-real-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    OPENAI_API_KEY: str = ""
    NEWS_API_KEY: str = ""

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@tradetracker.local"

    SEC_EDGAR_USER_AGENT: str = "TradeTracker admin@tradetracker.local"

    SCRAPE_INTERVAL_HOURS: int = 6
    NEWS_REFRESH_MINUTES: int = 30
    NOTIFICATION_POLL_SECONDS: int = 60

    ADMIN_EMAIL: str = "admin@tradetracker.local"
    ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
