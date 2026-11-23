"""Canonical age labels include alternate title spellings, not ordinary pairs."""

from app.services.tournament_detection import DetectionGame, detect


def game(key: str, title: str, age: str = "U11") -> DetectionGame:
    return DetectionGame(key, title, "Riverside", age)


def test_plural_age_pitch_recordings_join_same_day_numbered_tournament() -> None:
    games = [
        game("hudl:a", "261026 U11 v Town (A) - Game 1"),
        game("hudl:b", "261026 U11 v Rovers (A) - Game 2"),
        game("hudl:c", "261026 U11 v Rovers (A) - Game 3"),
        game("hudl:d", "261026 U11s v Town (A) - Pitch 1"),
        game("hudl:e", "261026 U11s v Town (A) - Pitch 2"),
    ]
    groups = detect(games)
    assert len(groups) == 1
    assert set(groups[0].entries) == {g.key for g in games}


def test_under_and_space_labels_are_canonical_but_other_ages_stay_separate() -> None:
    groups = detect(
        [
            game("hudl:a", "261026 U11 Winter Cup v Town"),
            game("veo:b", "261026 Under-11 Winter Cup v Rovers", "Under 11"),
            game("hudl:c", "261026 U 11s Winter Cup v City", "U 11s"),
            game("hudl:d", "261026 U12 Winter Cup v Town", "U12"),
        ]
    )
    assert len(groups) == 2
    assert sorted(len(g.entries) for g in groups) == [1, 3]


def test_different_pitches_against_one_opponent_do_not_fabricate_a_tournament() -> None:
    assert (
        detect(
            [
                game("hudl:a", "261026 U11s v Town - Pitch 1"),
                game("hudl:b", "261026 U11s v Town - Pitch 2"),
                game("hudl:c", "261026 U11s v Town - Pitch 3"),
            ]
        )
        == []
    )
