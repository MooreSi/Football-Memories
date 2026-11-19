"""Every folder a hosted container writes to is created in the image and owned by the app
user, so Docker gives a new named volume mounted there that owner. Found 2026-11-19: the
shared crest service's /crests was root-owned and every crest it fetched failed to save."""

import re
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"


def _owned_by_app() -> set[str]:
    text = DOCKERFILE.read_text()
    made = set(re.findall(r"(/[\w/]+)", " ".join(re.findall(r"mkdir -p ([^&\n]+)", text))))
    owned = set(re.findall(r"(/[\w/]+)", " ".join(re.findall(r"chown -R app:app ([^&\n]+)", text))))
    return {d for d in made if any(d == o or d.startswith(o + "/") for o in owned)}


def test_volume_folders_exist_and_belong_to_the_app_user() -> None:
    folders = _owned_by_app()
    for folder in ("/archive", "/inbox/uploaded", "/crests"):
        assert folder in folders, folder
