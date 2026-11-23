import pytest

from app.services import team_logos


@pytest.fixture(autouse=True)
def _jgh_lists_no_clubs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Junior Grassroots Hub (owner request 2026-11-23) is a crest source. Unless a test
    gives it clubs (test_jgh_crests.py), its clubs list is already known and empty, so the
    other crest tests see the sources they were written for and nothing more."""
    monkeypatch.setattr(team_logos, "_JGH_INDEX", {"slugs": [], "until": float("inf")})
