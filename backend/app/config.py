from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://timesheet:timesheet@db:5432/timesheet"
    DATABASE_URL_SYNC: str = "postgresql://timesheet:timesheet@db:5432/timesheet"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-strong-random-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Azure AD / Entra ID
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"

    # App
    APP_NAME: str = "Timesheet Management"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    ADMIN_DEFAULT_PASSWORD: str = "admin"

    # Work schedule
    WORK_START: str = "09:00"
    WORK_END: str = "18:00"
    LUNCH_START: str = "13:00"
    LUNCH_END: str = "14:00"
    DAILY_HOURS: float = 8.0
    FLEX_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def azure_authority(self) -> str:
        return f"https://login.microsoftonline.com/{self.AZURE_TENANT_ID}"

    @property
    def azure_token_url(self) -> str:
        return f"{self.azure_authority}/oauth2/v2.0/token"

    @property
    def azure_authorize_url(self) -> str:
        return f"{self.azure_authority}/oauth2/v2.0/authorize"

    @property
    def azure_jwks_url(self) -> str:
        return f"https://login.microsoftonline.com/{self.AZURE_TENANT_ID}/discovery/v2.0/keys"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
