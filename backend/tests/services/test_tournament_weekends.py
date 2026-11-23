"""Owner rule: normal weekend format pairs are not unnamed tournaments."""

import pytest

from app.services.tournament_detection import DetectionGame, detect


def fixture(key: str, opponent: str, suffix: str = "") -> DetectionGame:
    return DetectionGame(key, f"261122 U11 v {opponent} {suffix}", "Riverside", "U11")


@pytest.mark.parametrize(
    "formats", [("(9v9)", "(11v11)"), ("5v5", "7v7"), ("(Game 1)", "(Game 2)")]
)
def test_same_opponent_weekend_pairs_are_not_tournaments(formats: tuple[str, str]) -> None:
    assert (
        detect([fixture("hudl:a", "Rovers", formats[0]), fixture("hudl:b", "Rovers", formats[1])])
        == []
    )


def test_two_different_opponents_alone_do_not_prove_a_tournament() -> None:
    assert detect([fixture("hudl:a", "Rovers"), fixture("hudl:b", "Town")]) == []


def test_repeated_numbered_games_against_one_opponent_are_not_a_tournament() -> None:
    assert detect([fixture(f"hudl:{i}", "Rovers", f"(Game {i})") for i in range(1, 5)]) == []


def test_multiple_opponents_and_three_distinct_games_are_reviewable() -> None:
    groups = detect(
        [
            fixture("hudl:a", "Rovers", "(Game 1)"),
            fixture("hudl:b", "Town", "(Game 2)"),
            fixture("hudl:c", "City", "(Game 3)"),
        ]
    )
    assert len(groups) == 1
    assert len(groups[0].entries) == 3


def test_cross_source_views_cannot_inflate_two_fixtures_into_three() -> None:
    assert (
        detect([fixture("hudl:a", "Rovers"), fixture("veo:a", "Rovers"), fixture("hudl:b", "Town")])
        == []
    )


def test_format_variants_do_not_inflate_two_opponents_into_three_games() -> None:
    assert (
        detect(
            [
                fixture("hudl:a", "Rovers", "5v5"),
                fixture("hudl:b", "Rovers", "7v7"),
                fixture("hudl:c", "Town"),
            ]
        )
        == []
    )
