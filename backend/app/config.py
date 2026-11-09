"""Environment-based configuration. See .env.example for every variable."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FM_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://memories:memories@localhost:5432/memories"
    archive_root: Path = Path("./data/archive")
    import_root: Path = Path("./data/inbox")
    log_level: str = "INFO"
    render_worker: bool = True  # background highlight-reel renderer (spec 080)
    auto_backup: bool = True  # one automatic backup per day while running (spec 070)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @field_validator("archive_root", "import_root")
    @classmethod
    def _absolute(cls, v: Path) -> Path:
        """Resolve once at start-up, so a later working-directory change cannot move them."""
        return v.expanduser().resolve()

    @property
    def library_root(self) -> Path:
        """Everything the app writes lives under ARCHIVE_ROOT/FootballMemories."""
        return self.archive_root / "FootballMemories"
