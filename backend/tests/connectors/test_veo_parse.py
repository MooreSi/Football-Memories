"""Spec 250: Veo recordings, details and highlights become the helper's library items."""

from app.connectors.veo._parse import library_item, next_page
from tests.connectors.veo_fixtures.synthetic import (
    ACTIVE_ID,
    EXPIRED_ID,
    detail,
    highlights,
    periods,
    recording,
    videos,
)


def test_an_active_match_becomes_a_library_item_with_its_highlights_as_moments() -> None:
    item = library_item(recording(), detail(), highlights(), periods(), videos())
    assert item["id"] == f"veo-{ACTIVE_ID}"
    assert item["source"] == "veo"
    assert item["title"] == "261108 Riverside U11 vs Northgate"
    assert item["season_label"] == "2026/27"
    assert item["age_group"] == "U11"
    assert item["duration_s"] == 3120.4
    assert item["available"] is True and item["video_height"] == 1080
    assert item["score"] == {"ours": 3, "theirs": 1}
    assert item["halves"] == [[51, 1476], [1600, 3050]]
    assert item["moments"] == [
        {"id": "h-1", "category": "SHOT ON GOAL", "time_s": 64.0, "duration_s": 25.0, "ai": True},
        {
            "id": "h-3",
            "category": "VEO CLIP",
            "time_s": 900.5,
            "duration_s": 12.0,
            "ai": False,
            "note": "Great press",
        },
        {"id": "h-2", "category": "GOAL", "time_s": 1420.0, "duration_s": 25.0, "ai": True},
    ]


def test_no_remote_media_address_is_kept() -> None:
    item = library_item(recording(), detail(), highlights(), periods(), videos())
    assert "veocdn" not in repr(item)  # thumbnails are fetched through the helper later
    assert "veocdn" in repr(highlights()) + repr(videos()) + repr(recording())  # negative control


def test_an_expired_match_keeps_its_details_but_has_no_video_or_moments() -> None:
    item = library_item(recording(EXPIRED_ID, expiration_status="expired"))
    assert item["available"] is False and item["moments"] == []
    assert item["expiration_status"] == "expired"
    assert item["title"] == "261108 Riverside U11 vs Northgate"


def test_a_title_that_already_starts_with_a_date_is_not_given_a_second_one() -> None:
    assert (
        library_item(recording(title="261108 Riverside v Northgate"))["title"]
        == "261108 Riverside v Northgate"
    )


def test_the_next_page_comes_from_the_link_header_only() -> None:
    link = '<https://app.veo.co/api/app/clubs/riverside/recordings/?filter=own&page=3>; rel="next"'
    assert next_page(link) == 3
    assert next_page('<https://app.veo.co/x/?page=2>; rel="prev"') is None
    assert next_page(None) is None
