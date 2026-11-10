from datetime import date

from app.models import Match, Season, Team


def test_age_group_is_filtered_before_pagination_and_count(db, client):
    team = Team(name="Riverside")
    season = Season(label="2026/27")
    db.add_all([team, season])
    db.flush()
    db.add_all(
        [
            Match(
                team_id=team.id,
                season_id=season.id,
                age_group="U10",
                opponent="Rovers",
                match_date=date(2026, 11, 1),
                source="synthetic",
                source_match_id="a",
            ),
            Match(
                team_id=team.id,
                season_id=season.id,
                age_group="U12",
                opponent="City",
                match_date=date(2026, 11, 2),
                source="synthetic",
                source_match_id="b",
            ),
        ]
    )
    db.commit()
    response = client.get("/api/matches", params={"age_group": "U10", "page_size": 1})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["opponent"] == "Rovers"
