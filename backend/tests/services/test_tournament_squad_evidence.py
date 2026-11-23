"""Cohort evidence from synthetic tagged squads; mixed recordings remain reviewable."""

from app.services.tournament_detection import DetectionGame, detect


def game(key: str, players: list[str]) -> DetectionGame:
    return DetectionGame(
        key=key,
        title="261026 U11 Winter Cup v Rovers",
        club="Riverside",
        age_group="U11",
        players=players,
    )


def test_strong_unique_cohort_wins_over_a_few_shared_players() -> None:
    shared = [f"Shared Player {i}" for i in range(3)]
    blue = shared + [f"Blue Player {i}" for i in range(5)]
    white = shared + [f"White Player {i}" for i in range(5)]
    groups = detect(
        [
            game("hudl:a", blue),
            game("hudl:b", blue),
            game("hudl:c", white),
            game("hudl:d", white),
            game("hudl:e", white[:-1]),
        ]
    )
    entries = groups[0].entries
    assert entries["hudl:c"] != "Team unassigned"
    assert entries["hudl:e"] == entries["hudl:c"]
    assert entries["hudl:e"] != entries["hudl:a"]


def test_a_recording_containing_both_complete_squads_is_not_forced_into_one() -> None:
    blue = [f"Blue Player {i}" for i in range(8)]
    white = [f"White Player {i}" for i in range(8)]
    groups = detect(
        [
            game("hudl:a", blue),
            game("hudl:b", blue),
            game("hudl:c", white),
            game("hudl:d", blue + white + ["Extra Player"]),
        ]
    )
    assert groups[0].entries["hudl:d"] == "Team unassigned"
    assert "ambiguous" in groups[0].automatic["hudl:d"].reason.lower()


def test_assigning_a_mixed_recording_to_an_existing_squad_does_not_renumber_it() -> None:
    blue = [f"Blue Player {i}" for i in range(8)]
    white = [f"White Player {i}" for i in range(8)]
    games = [
        game("hudl:a", blue),
        game("hudl:b", blue),
        game("hudl:c", white),
        game("hudl:d", blue + white),
    ]
    previous = detect(games)[0]
    white_team = previous.entries["hudl:c"]
    previous.entries["hudl:d"] = white_team
    previous.automatic.pop("hudl:d")
    inferred = detect(games, [previous])[0]
    assert inferred.entries["hudl:c"] == white_team
    assert inferred.entries["hudl:d"] == white_team
    assert len(set(inferred.entries.values())) == 2
