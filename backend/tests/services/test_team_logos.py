from app.services.team_logos import club_name, logo_candidate


def test_age_group_and_club_suffixes_share_identity() -> None:
    assert club_name("Aston Villa U10") == "aston villa"
    assert club_name("Stoke City FC U12") == "stoke city"


def test_known_official_crests_and_unknown_fallback() -> None:
    assert logo_candidate("Aston Villa U10") is not None
    assert logo_candidate("Stoke City") is not None
    assert logo_candidate("Riverside U12") is None


def test_real_crest_cache_reuses_bytes_without_network(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    calls = []

    def fetch(url):
        calls.append(url)
        return b"\x89PNG\r\n\x1a\nsynthetic-image"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    first = cached_crest("Aston Villa U10", tmp_path)
    second = cached_crest("Aston Villa U12", tmp_path)
    assert first == second
    assert first.read_bytes() == b"\x89PNG\r\n\x1a\nsynthetic-image"
    assert len(calls) == 1


def _wiki(image: str | None, missing: bool = False) -> bytes:
    import json

    page = (
        {"missing": ""}
        if missing
        else (
            {
                "pageimage": image.split("/thumb/")[-1].split("/")[2]
                if "/thumb/" in image
                else image.rsplit("/", 1)[-1],
                "thumbnail": {"source": image},
            }
            if image
            else {}
        )
    )
    return json.dumps({"query": {"pages": {"1": page}}}).encode()


def test_one_word_club_is_looked_up_as_a_football_club(tmp_path, monkeypatch) -> None:
    """Owner decision 2026-11-11: every team is a football club, so "Liverpool" means
    Liverpool F.C. Its Wikipedia crest is named Liverpool_FC.svg (no "crest" word)."""
    from urllib.parse import parse_qs, urlsplit

    from app.services.team_logos import cached_crest

    asked = []
    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/250px-Liverpool_FC.svg.png"

    def fetch(url):
        if "api.php" in url:
            asked.append(parse_qs(urlsplit(url).query)["titles"][0])
            return _wiki(crest)
        assert url == crest
        return b"\x89PNG\r\n\x1a\nliverpool"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    path = cached_crest("Liverpool", tmp_path)
    assert path is not None and path.read_bytes().endswith(b"liverpool")
    assert asked == ["Liverpool F.C."]


def test_other_club_name_forms_are_tried_in_turn(tmp_path, monkeypatch) -> None:
    from urllib.parse import parse_qs, urlsplit

    from app.services.team_logos import cached_crest

    asked = []
    crest = "https://upload.wikimedia.org/wikipedia/en/a/ab/Rovers_AFC_badge.png"

    def fetch(url):
        if "api.php" in url:
            title = parse_qs(urlsplit(url).query)["titles"][0]
            asked.append(title)
            return _wiki(crest) if title == "Rovers A.F.C." else _wiki(None, missing=True)
        return b"\x89PNG\r\n\x1a\nrovers"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Rovers", tmp_path) is not None
    assert asked == ["Rovers F.C.", "Rovers A.F.C."]


def test_a_photo_is_never_taken_as_a_crest(tmp_path, monkeypatch) -> None:
    from unittest.mock import Mock

    from app.services.team_logos import cached_crest

    photo = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Stadium_2019.jpg/250px-Stadium_2019.jpg"
    fetch = Mock(return_value=_wiki(photo))
    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Nowhere Town", tmp_path) is None
    assert all(
        "api.php" in c.args[0] for c in fetch.call_args_list
    )  # the photo is never downloaded
