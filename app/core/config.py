from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # CORS
    cors_origins: tuple[str, ...] = tuple(
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "").split(",")
        if o.strip()
    ) or ("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173")

    # Environment
    env: str = os.getenv("ENV", "development")

    # Uploads
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads/prescriptions")
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))

    def __post_init__(self) -> None:  # pragma: no cover - trivial guard
        secret = os.getenv("SECRET_KEY")
        if secret:
            object.__setattr__(self, "jwt_secret_key", secret)
        else:
            if self.env == "production":
                raise RuntimeError(
                    "SECRET_KEY environment variable is required in production."
                )
            object.__setattr__(self, "jwt_secret_key", "dev-fallback-secret-key-change-in-production")


settings = Settings()
