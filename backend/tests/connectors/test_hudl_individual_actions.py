"""Synthetic player-label metadata; no real account, roster or response dumps."""

from app.connectors.hudl_capture import parse_moments
from app.connectors.hudl_metadata import MatchCache
from tests.connectors.test_hudl_capture import VIDEO, payload


def labelled_payload():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {"key": "Individual action", "values": ["Passing", "Interception"]},
        {"key": "Private note", "values": ["https://example.invalid/?token=FAKE_SECRET"]},
    ]
    return data


def test_individual_actions_remain_linked_to_the_original_player_moment():
    moment = parse_moments([labelled_payload()], VIDEO, set())[0]
    assert moment.actions == ("passes", "interceptions")
    assert moment.category == "SAM EXAMPLE"
    assert moment.source_event_id == "synthetic-session:synthetic-stable-id"


def test_only_supported_action_values_survive_the_cache(tmp_path):
    cache = MatchCache(tmp_path)
    cache.write(
        "synthetic",
        {
            "moments": [
                {
                    "id": "p",
                    "category": "Sam Example",
                    "time_s": 1,
                    "duration_s": 10,
                    "actions": ["passes", "interceptions", "FAKE_SECRET"],
                }
            ]
        },
    )
    saved = cache.read("synthetic")["moments"][0]
    assert saved["actions"] == ["passes", "interceptions"]
    assert "FAKE_SECRET" not in next(tmp_path.glob("*.json")).read_text()
    assert "FAKE_SECRET" in "planted FAKE_SECRET"


def test_unsuccessful_or_unspecified_dribbling_does_not_count_as_success():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [{"key": "Individual action", "values": ["Dribbling", "Unsuccessful"]}]
    assert parse_moments([data], VIDEO, set())[0].actions == ()


def test_successful_dribble_has_an_explicit_outcome():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [{"key": "Individual action", "values": ["Successful dribble"]}]
    assert parse_moments([data], VIDEO, set())[0].actions == ("successfulDribbles",)


def test_stream_preserves_actions_through_the_normal_metadata_cache(tmp_path):
    from unittest.mock import MagicMock, patch

    from app.connectors.hudl_browser import BrowserConnection
    from tests.connectors.test_hudl_optional_tags import MASTER_BODY, MEDIA, observation

    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 8.0
    observed = observation()
    observed.payloads = [labelled_payload()]
    with (
        patch.object(connection, "_observe", return_value=observed),
        patch(
            "app.connectors.hudl_browser._account.fetch_media",
            side_effect=[MASTER_BODY.encode(), MEDIA],
        ),
    ):
        connection._prepare_stream(VIDEO)
    saved = connection.details.read(VIDEO)["moments"][0]
    assert saved["actions"] == ["passes", "interceptions"]
    assert saved["id"] == "synthetic-session:synthetic-stable-id"
    connection._executor.shutdown()


def test_shared_code_moment_does_not_assign_a_player_action_to_both_codes():
    data = labelled_payload()
    data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]["tags"][0]["values"] = [
        "Sam Example",
        "Ali Demo",
    ]
    assert [m.actions for m in parse_moments([data], VIDEO, set())] == [(), ()]


def test_hierarchical_individual_action_label_is_supported_without_retaining_raw_labels():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [{"key": "HUDL_LABEL", "values": ["INDIVIDUAL ACTION ▶ PASSING"]}]
    assert parse_moments([data], VIDEO, set())[0].actions == ("passes",)


def test_season_duel_and_foul_actions_survive_parser_and_cache_without_assumed_outcomes(tmp_path):
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {
            "key": "Individual action",
            "values": [
                "Def 1v1",
                "Att 1v1",
                "Foul",
                "1v1",
                "Defending",
                "Dribbling",
            ],
        }
    ]
    moment = parse_moments([data], VIDEO, set())[0]
    assert moment.actions == ("defensive1v1", "attacking1v1", "fouls")
    cache = MatchCache(tmp_path)
    cache.write(
        "synthetic-duels",
        {
            "moments": [
                {
                    "id": "p",
                    "category": "Sam Example",
                    "time_s": 1,
                    "duration_s": 10,
                    "actions": list(moment.actions),
                }
            ]
        },
    )
    assert cache.read("synthetic-duels")["moments"][0]["actions"] == [
        "defensive1v1",
        "attacking1v1",
        "fouls",
    ]


def test_penalty_outcomes_require_explicit_labels_and_survive_cache(tmp_path):
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {
            "key": "Individual action",
            "values": ["Penalty stopped", "Penalty scored", "Penalty", "Penalty missed"],
        }
    ]
    moment = parse_moments([data], VIDEO, set())[0]
    assert moment.actions == ("penaltiesSaved", "penaltiesScored")
    cache = MatchCache(tmp_path)
    cache.write(
        "synthetic-penalty",
        {
            "moments": [
                {
                    "id": "p",
                    "category": "Sam Example",
                    "time_s": 1,
                    "duration_s": 10,
                    "actions": list(moment.actions),
                }
            ]
        },
    )
    assert cache.read("synthetic-penalty")["moments"][0]["actions"] == [
        "penaltiesSaved",
        "penaltiesScored",
    ]


def test_repeated_labels_on_one_clip_each_count_through_parse_and_cache(tmp_path):
    # Spec 830: Sportscode lets a label repeat on one instance; Ipswich 12 Jul had 274 Passing
    # labels on 59 clips. A set per moment counted each clip once.
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {"key": "Individual action", "values": ["Passing"]},
        {"key": "Individual action", "values": ["Def 1v1"]},
        {"key": "Individual action", "values": ["Passing", "Passing"]},
        {"key": "HUDL_LABEL", "values": ["INDIVIDUAL ACTION ▶ PASSING"]},
    ]
    moment = parse_moments([data], VIDEO, set())[0]
    assert moment.actions == ("passes", "passes", "passes", "passes", "defensive1v1")
    cache = MatchCache(tmp_path)
    cache.write(
        "synthetic-repeats",
        {
            "moments": [
                {
                    "id": "p",
                    "category": "Sam Example",
                    "time_s": 1,
                    "duration_s": 10,
                    "actions": [*moment.actions, "FAKE_SECRET"],
                }
            ]
        },
    )
    saved = cache.read("synthetic-repeats")["moments"][0]["actions"]
    assert saved == ["passes", "passes", "passes", "passes", "defensive1v1"]


def test_a_tag_key_and_its_value_naming_one_action_count_once():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {"key": "Passes", "values": ["Pass completed"]},
        {"key": "Cross", "values": []},
    ]
    assert parse_moments([data], VIDEO, set())[0].actions == ("passes", "crosses")


def test_the_coachs_other_individual_action_labels_are_kept():
    data = payload()
    item = data["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]
    item["tags"] += [
        {
            "key": "Individual action",
            "values": [
                "Dribbling &amp; RWTB",
                "Defensive action",
                "Receiving",
                "Ball protection and turning",
                "Finishing",
                "Dribbling",
            ],
        }
    ]
    assert parse_moments([data], VIDEO, set())[0].actions == (
        "dribbling",
        "defensiveActions",
        "receiving",
        "ballProtection",
        "finishing",
    )
