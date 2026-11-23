"""Only synthetic fixture names and squads. No source requests."""

from app.services.tournament_detection import DetectionGame, detect

BLUE = ["Pat Example", "Alex Demo", "Chris Sample", "Robin Test", "Lee Fiction"]
WHITE = ["Taylor Sample", "Morgan Demo", "Drew Example", "Casey Test", "Sam Fiction"]


def game(
    key: str,
    number: int,
    players: list[str],
    *,
    date: str = "261122",
    club: str = "Riverside",
    age: str = "U11",
    event: str = "Winter Cup",
) -> DetectionGame:
    return DetectionGame(
        key=key,
        title=f"{date} {age} {event} v Rovers (Game {number})",
        club=club,
        age_group=age,
        players=players,
    )


def test_named_numbered_games_group_by_date_and_split_repeated_rosters() -> None:
    groups = detect(
        [
            game("hudl:a", 1, BLUE),
            game("hudl:b", 2, WHITE),
            game("hudl:c", 3, BLUE),
            game("hudl:d", 4, WHITE),
        ]
    )
    assert len(groups) == 1
    entries = groups[0].entries
    assert entries["hudl:a"] == entries["hudl:c"]
    assert entries["hudl:b"] == entries["hudl:d"]
    assert entries["hudl:a"] != entries["hudl:b"]
    assert groups[0].automatic["hudl:a"].confidence == "review"
    assert "player" in groups[0].automatic["hudl:a"].reason.lower()


def test_date_club_and_age_are_independent_scopes() -> None:
    groups = detect(
        [
            game("hudl:a", 1, BLUE, event="Winter Cup"),
            game("hudl:b", 1, BLUE, date="261123", event="Winter Cup"),
            game("hudl:c", 1, BLUE, club="Northgate", event="Winter Cup"),
            game("hudl:d", 1, BLUE, age="U12", event="Winter Cup"),
        ]
    )
    assert len(groups) == 4
    assert len({g.id for g in groups}) == 4


def test_two_named_events_on_one_day_stay_separate() -> None:
    groups = detect(
        [
            game("hudl:a", 1, BLUE, event="Winter Cup"),
            game("hudl:b", 2, BLUE, event="Summer Festival"),
        ]
    )
    assert len(groups) == 2
    assert {g.name.split(" · ")[0] for g in groups} == {"Winter Cup", "Summer Festival"}


def test_sparse_and_missing_rosters_stay_unassigned() -> None:
    groups = detect([game("hudl:a", 1, BLUE), game("hudl:b", 2, BLUE[:2]), game("veo:c", 3, [])])
    assert groups[0].entries["hudl:b"] == "Team unassigned"
    assert groups[0].entries["veo:c"] == "Team unassigned"
    assert "insufficient" in groups[0].automatic["veo:c"].reason.lower()


def test_roster_overlap_does_not_chain_two_distinct_squads_together() -> None:
    bridge = BLUE[:3] + WHITE[:3]
    groups = detect([game("hudl:a", 1, BLUE), game("hudl:b", 2, WHITE), game("hudl:c", 3, bridge)])
    assert groups[0].entries["hudl:a"] != groups[0].entries["hudl:b"]
    assert groups[0].entries["hudl:c"] == "Team unassigned"


def test_explicit_home_team_label_wins_without_roster_and_ignores_opponent_colour() -> None:
    groups = detect(
        [
            DetectionGame(
                key="veo:a",
                title="261122 U11 Blue Winter Cup v White Rovers (Game 1)",
                club="Riverside",
                age_group="U11",
            ),
            DetectionGame(
                key="veo:b",
                title="261122 U11 White Winter Cup v Blue Rovers (Game 2)",
                club="Riverside",
                age_group="U11",
            ),
        ]
    )
    assert len(groups) == 1
    assert groups[0].entries == {"veo:a": "Riverside Blue", "veo:b": "Riverside White"}
    assert groups[0].automatic["veo:a"].confidence == "high"


def test_single_fixture_duplicate_views_and_halves_are_not_tournaments() -> None:
    assert (
        detect(
            [
                DetectionGame(
                    key="hudl:a", title="261122 U11 v Rovers", club="Riverside", age_group="U11"
                ),
                DetectionGame(
                    key="veo:a", title="261122 U11 v Rovers", club="Riverside", age_group="U11"
                ),
                DetectionGame(
                    key="hudl:b",
                    title="261122 U11 v Rovers (1st Half)",
                    club="Riverside",
                    age_group="U11",
                ),
                DetectionGame(
                    key="hudl:c",
                    title="261122 U11 v Rovers (2nd Half)",
                    club="Riverside",
                    age_group="U11",
                ),
            ]
        )
        == []
    )


def test_multiple_fixtures_on_same_day_are_reviewable_and_unknown_date_is_not_guessed() -> None:
    groups = detect(
        [
            DetectionGame(
                key="hudl:a", title="261122 U11 v Rovers", club="Riverside", age_group="U11"
            ),
            DetectionGame(
                key="hudl:b", title="261122 U11 v Town", club="Riverside", age_group="U11"
            ),
            DetectionGame(
                key="hudl:e", title="261122 U11 v City", club="Riverside", age_group="U11"
            ),
            DetectionGame(
                key="hudl:c", title="Winter Cup v Town", club="Riverside", age_group="U11"
            ),
            DetectionGame(
                key="hudl:d",
                title="261132 U11 Winter Cup v Town",
                club="Riverside",
                age_group="U11",
            ),
        ]
    )
    assert len(groups) == 1
    assert set(groups[0].entries) == {"hudl:a", "hudl:b", "hudl:e"}
    assert groups[0].automatic["hudl:a"].confidence == "review"


def test_new_earlier_squad_does_not_renumber_existing_squads() -> None:
    originals = [game("hudl:b", 1, BLUE), game("hudl:c", 2, WHITE)]
    previous = detect(originals)
    added = game("hudl:a", 3, ["Jamie Demo", "Charlie Example", "Sky Sample", "Avery Test"])
    groups = detect([added, *originals], previous)
    assert groups[0].entries["hudl:b"] == previous[0].entries["hudl:b"]
    assert groups[0].entries["hudl:c"] == previous[0].entries["hudl:c"]
    assert groups[0].entries["hudl:a"] not in previous[0].entries.values()


def test_an_away_fixture_uses_our_named_side_for_squad_and_event() -> None:
    groups = detect(
        [
            DetectionGame(
                key="veo:a",
                title="261122 White Rovers v Riverside Blue Winter Cup (Game 1)",
                club="Riverside",
                age_group="U11",
            )
        ]
    )
    assert len(groups) == 1
    assert groups[0].name.startswith("Winter Cup")
    assert groups[0].entries == {"veo:a": "Riverside Blue"}
