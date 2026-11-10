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


def test_ambiguous_single_word_team_does_not_guess_a_club(tmp_path, monkeypatch) -> None:
    from unittest.mock import Mock

    from app.services.team_logos import cached_crest

    fetch = Mock(return_value=b"{}")
    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("City", tmp_path) is None
    fetch.assert_not_called()
