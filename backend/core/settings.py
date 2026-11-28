"""Validated application settings loaded from environment variables and `.env`."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy.engine import make_url


_BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://netmedika_user:netmedika@localhost:5432/netmedika"

    jwt_secret_key: str = Field(default="", validation_alias="SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=15, gt=0)
    refresh_token_expire_days: int = Field(default=30, gt=0)

    cors_origins: Annotated[tuple[str, ...], NoDecode] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    )
    env: str = "development"
    log_level: str = "INFO"

    upload_dir: str = "uploads/prescriptions"
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_secret_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="SUPABASE_SECRET_KEY"
    )
    supabase_service_role_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )
    supabase_storage_bucket: str = Field(default="uploads", validation_alias="SUPABASE_STORAGE_BUCKET")
    supabase_signed_url_expiry_seconds: int = Field(
        default=3600, gt=0, le=604800, validation_alias="SUPABASE_SIGNED_URL_EXPIRY_SECONDS"
    )

    google_client_id: str = Field(default="", validation_alias="GOOGLE_CLIENT_ID")
    apple_client_id: str = Field(default="", validation_alias="APPLE_CLIENT_ID")

    smtp_host: str = Field(default="", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, gt=0, validation_alias="SMTP_PORT")
    smtp_username: str = Field(default="", validation_alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", validation_alias="SMTP_FROM_EMAIL")
    smtp_starttls: bool = Field(default=True, validation_alias="SMTP_STARTTLS")
    smtp_use_ssl: bool = Field(default=False, validation_alias="SMTP_USE_SSL")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> tuple[str, ...]:
        if isinstance(value, str):
            origins = tuple(origin.strip() for origin in value.split(",") if origin.strip())
            return origins or (
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
            )
        if isinstance(value, (list, tuple)):
            return tuple(str(origin).strip() for origin in value if str(origin).strip())
        raise ValueError("CORS_ORIGINS must be a comma-separated string or a list")

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: object) -> str:
        level = str(value or "INFO").upper()
        if level not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise ValueError("LOG_LEVEL must be CRITICAL, ERROR, WARNING, INFO, or DEBUG")
        return level

    @field_validator("google_client_id", "apple_client_id", mode="before")
    @classmethod
    def normalize_oauth_client_id(cls, value: object) -> str:
        return str(value or "").strip()

    @field_validator("supabase_url", "supabase_storage_bucket", mode="before")
    @classmethod
    def normalize_supabase_setting(cls, value: object) -> str:
        return str(value or "").strip().rstrip("/")

    @model_validator(mode="after")
    def validate_security_settings(self) -> Settings:
        self.env = self.env.strip().lower()
        self.database_url = self.database_url.strip()
        if not self.database_url:
            raise ValueError("DATABASE_URL must not be empty")
        database_url = make_url(self.database_url)
        if (
            database_url.get_backend_name() == "sqlite"
            and database_url.database not in (None, "", ":memory:")
            and not Path(database_url.database).is_absolute()
        ):
            database_path = (_BACKEND_DIR / database_url.database).resolve()
            self.database_url = database_url.set(database=str(database_path)).render_as_string(
                hide_password=False
            )
        if not self.jwt_secret_key:
            if self.env == "production":
                raise ValueError("SECRET_KEY environment variable is required in production")
            self.jwt_secret_key = "dev-fallback-secret-key-change-in-production"
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings object."""
    return Settings()


settings = get_settings()
