"""Environment-based configuration. See .env.example for every variable."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FM_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://memories:memories@localhost:5432/memories"
    archive_root: Path = Path("./data/archive")
    import_root: Path = Path("./data/inbox")
    log_level: str = "INFO"
    auto_backup: bool = True  # one automatic backup per day while running (spec 070)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @property
    def library_root(self) -> Path:
        """Everything the app writes lives under ARCHIVE_ROOT/FootballMemories."""
        return self.archive_root / "FootballMemories"
