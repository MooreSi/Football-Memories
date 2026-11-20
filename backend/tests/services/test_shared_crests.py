"""Owner decision 2026-11-19: hosted libraries share one crest service. Each club's crest is
fetched once (by the service, through its crest-only filter) and served to every family. A
family's library has no internet: on a local miss it asks the service at FM_CREST_SERVICE,
keeps the answer locally, and never asks again. Crests a family uploads stay theirs. The
owner's own install (no FM_CREST_SERVICE) looks crests up itself, as before. Offline."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.services import team_logos

PNG = b"\x89PNG\r\n\x1a\n" + b"crest-bytes"
SERVICE = "http://crests:8200"


@pytest.fixture(autouse=True)
def clean(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(team_logos, "_MISSES", {})
    monkeypatch.setattr(team_logos, "_PAUSED_UNTIL", [0.0])
    monkeypatch.setattr(team_logos, "_UNSETTLED", set())


@pytest.fixture
def asked(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """The service as the library sees it: answers by club name; records every request."""
    calls: list[str] = []
    answers = {"Cardiff City": (200, PNG), "Nobody FC": (404, b"")}

    def shared(url: str) -> tuple[int, bytes]:
        calls.append(url)
        name = url.split("name=", 1)[1].replace("+", " ")
        if name == "Unreachable":
            raise OSError("no route")
        return answers.get(name, (404, b""))

    monkeypatch.setattr(team_logos, "_shared_get", shared)
    return calls


@pytest.fixture
def internet(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    calls: list[str] = []

    def fetch(url: str) -> bytes:
        calls.append(url)
        raise OSError("blocked")

    monkeypatch.setattr(team_logos, "_fetch", fetch)
    return calls


def test_a_hosted_library_gets_a_crest_from_the_service_once(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, asked: list[str], internet: list[str]
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    path = team_logos.cached_crest("Cardiff City", tmp_path)
    assert path is not None and path.read_bytes() == PNG
    assert asked == [f"{SERVICE}/crest?name=Cardiff+City"]
    assert team_logos.cached_crest("Cardiff City", tmp_path) == path
    assert len(asked) == 1  # kept locally
    assert internet == []  # the library itself never looks anything up


def test_a_familys_own_upload_wins_and_the_service_is_not_asked(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, asked: list[str]
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    mine = b"\x89PNG\r\n\x1a\n" + b"our-own"
    team_logos.save_crest("Cardiff City", mine, tmp_path)
    path = team_logos.cached_crest("Cardiff City", tmp_path)
    assert path is not None and path.read_bytes() == mine
    assert asked == []


def test_no_crest_at_the_service_is_no_crest_and_writes_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, asked: list[str]
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    assert team_logos.cached_crest("Nobody FC", tmp_path) is None
    assert team_logos.cached_crest("Nobody FC", tmp_path) is None
    assert len(asked) == 1  # a miss is remembered for a while
    assert not list(tmp_path.glob("*"))


def test_an_unreachable_service_is_tried_again_later_not_remembered(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, asked: list[str]
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    assert team_logos.cached_crest("Unreachable", tmp_path) is None
    assert team_logos.cached_crest("Unreachable", tmp_path) is None
    assert len(asked) == 2


def test_a_non_image_answer_is_refused(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    monkeypatch.setattr(team_logos, "_shared_get", lambda url: (200, b"<html>not a crest"))
    assert team_logos.cached_crest("Cardiff City", tmp_path) is None
    assert not list(tmp_path.glob("*"))


def test_the_owners_install_looks_crests_up_itself(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, asked: list[str], internet: list[str]
) -> None:
    """Negative control: without FM_CREST_SERVICE nothing goes to the service."""
    monkeypatch.delenv("FM_CREST_SERVICE", raising=False)
    team_logos.cached_crest("Cardiff City", tmp_path)
    assert asked == [] and internet


# --- the service itself ---------------------------------------------------------------


def _service(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.delenv("FM_CREST_SERVICE", raising=False)
    monkeypatch.setenv("FM_CREST_DIR", str(tmp_path))
    from app.crest_service import create_app

    return TestClient(create_app())


def test_the_service_answers_a_known_crest(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    looked: list[str] = []

    def found(name: str, directory: Path) -> Path:
        looked.append(name)
        target = directory / "x.png"
        target.write_bytes(PNG)
        return target

    monkeypatch.setattr(team_logos, "cached_crest", found)
    r = _service(tmp_path, monkeypatch).get("/crest", params={"name": "Cardiff City"})
    assert r.status_code == 200 and r.content == PNG
    assert r.headers["content-type"] == "image/png"
    assert looked == ["Cardiff City"]


def test_the_service_says_404_for_no_crest(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(team_logos, "cached_crest", lambda name, directory: None)
    assert (
        _service(tmp_path, monkeypatch).get("/crest", params={"name": "Nobody"}).status_code == 404
    )


@pytest.mark.parametrize("name", ["", "x" * 201])
def test_the_service_refuses_odd_names(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    monkeypatch.setattr(team_logos, "cached_crest", lambda n, d: pytest.fail("looked up"))
    assert _service(tmp_path, monkeypatch).get("/crest", params={"name": name}).status_code == 422


def test_the_service_offers_nothing_else(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client = _service(tmp_path, monkeypatch)
    assert client.post("/crest", params={"name": "x"}).status_code == 405
    for path in ("/api/team-logo", "/docs", "/openapi.json", "/"):
        assert client.get(path).status_code == 404, path


def test_the_service_refuses_to_start_pointing_at_itself(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    from app.crest_service import create_app

    with pytest.raises(RuntimeError):
        create_app()


# Owner report 2026-11-20: a freshly started crest service answered 404 for clubs it had not
# been able to ask everywhere (Wikipedia was rate-limiting it), and each library then kept
# that "no crest" for an hour. Not checked everywhere is now 503: ask again later.
def test_the_service_says_try_later_when_a_source_was_not_asked(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from email.message import Message
    from urllib.error import HTTPError

    monkeypatch.setattr(team_logos, "_SITE_PAUSED", {"wikimedia": 0.0, "sportsdb": 0.0})

    def fetch(url: str) -> bytes:
        if "thesportsdb.com" in url:
            return b'{"teams": null}'
        headers = Message()
        headers["Retry-After"] = "120"
        raise HTTPError(url, 429, "Too Many Requests", headers, None)

    monkeypatch.setattr(team_logos, "_fetch", fetch)
    service = _service(tmp_path, monkeypatch)
    answer = service.get("/crest", params={"name": "Elm Ravens"})
    assert answer.status_code == 503


def test_the_service_still_says_404_when_every_source_was_asked(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import json as _json

    monkeypatch.setattr(team_logos, "_SITE_PAUSED", {"wikimedia": 0.0, "sportsdb": 0.0})

    def fetch(url: str) -> bytes:
        if "thesportsdb.com" in url:
            return b'{"teams": null}'
        if "commons" in url or "list=search" in url:
            return _json.dumps({"query": {}}).encode()
        return _json.dumps({"query": {"pages": {"-1": {"missing": ""}}}}).encode()

    monkeypatch.setattr(team_logos, "_fetch", fetch)
    assert (
        _service(tmp_path, monkeypatch).get("/crest", params={"name": "Elm Ravens"}).status_code
        == 404
    )


def test_a_library_asks_again_after_try_later(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, internet: list[str]
) -> None:
    calls: list[str] = []

    def shared(url: str) -> tuple[int, bytes]:
        calls.append(url)
        return (503, b"") if len(calls) == 1 else (200, PNG)

    monkeypatch.setattr(team_logos, "_shared_get", shared)
    monkeypatch.setenv("FM_CREST_SERVICE", SERVICE)
    assert team_logos.cached_crest("Elm Ravens", tmp_path) is None
    assert team_logos.cached_crest("Elm Ravens", tmp_path) is not None
    assert len(calls) == 2
