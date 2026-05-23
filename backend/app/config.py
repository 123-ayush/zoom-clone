"""Typed application settings, loaded from environment variables / .env file."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Database — empty falls back to a local SQLite file (see database.py).
    database_url: str = ""

    # URLs used for CORS and invite-link generation.
    frontend_url: str = "http://localhost:3000"
    allowed_origins: str = "http://localhost:3000"

    # The single implicit user. The assignment specifies no authentication
    # ("assume a default user is logged in"), so the whole app shares one user.
    default_user_name: str = "Demo User"
    default_user_email: str = "demo@zoomclone.app"

    # Directory where uploaded meeting recordings are stored.
    recordings_dir: str = "recordings"

    log_level: str = "INFO"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
