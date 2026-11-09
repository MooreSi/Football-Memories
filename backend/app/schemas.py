from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class ImportIn(BaseModel):
    filename: str = Field(min_length=1, max_length=500)
    team_name: str = Field(min_length=1, max_length=200)
    season_label: str = Field(min_length=1, max_length=40)
    opponent: str = Field(min_length=1, max_length=200)
    match_date: date
    age_group: str | None = Field(default=None, max_length=40)
    competition: str | None = Field(default=None, max_length=200)


class InboxFile(BaseModel):
    filename: str
    size_bytes: int
    has_tags: bool


class MatchSummary(BaseModel):
    id: int
    team_id: int
    team_name: str
    season_id: int
    season_label: str
    age_group: str | None
    opponent: str
    match_date: date
    competition: str | None
    event_count: int
    media_id: int | None
    duration_s: float | None
    thumbnail_url: str | None
    offline: bool


class MatchPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[MatchSummary]


class MediaOut(BaseModel):
    id: int
    stream_url: str
    thumbnail_url: str | None
    available: bool
    duration_s: float
    width: int | None
    height: int | None
    fps: float | None
    video_codec: str | None
    audio_codec: str | None
    size_bytes: int
    original_filename: str


class EventOut(BaseModel):
    id: int
    time_s: float
    duration_s: float
    category: str
    players: list[str]
    note: str
    favourite: bool = False
    viewed: bool = False


class MatchDetail(MatchSummary):
    media: MediaOut | None
    events: list[EventOut]


class NamedItem(BaseModel):
    id: int
    name: str


class ConnectorOut(BaseModel):
    id: str
    name: str
    available: bool
    reason: str
    docs: str
    limitations: list[str]
    capabilities: dict[str, bool]


class TagCount(BaseModel):
    name: str
    count: int


class RecentMomentOut(BaseModel):
    event_id: int
    match_id: int
    time_s: float
    category: str
    players: list[str]
    team_name: str
    opponent: str
    match_date: date


class StatsOut(BaseModel):
    matches: int
    moments: int
    footage_seconds: float
    teams: int
    players: int
    top_tags: list[TagCount]
    recent_moments: list[RecentMomentOut]


class PlayerListItem(BaseModel):
    id: int
    display_name: str
    shirt_number: str | None
    position: str | None
    photo_url: str | None = None
    moments: int
    matches: int


class PlayerPatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    shirt_number: str | None = Field(default=None, max_length=10)
    position: str | None = Field(default=None, max_length=40)


class PlayerTotals(BaseModel):
    matches: int
    moments: int
    unwatched: int
    favourites: int


class TeamSeasonOut(BaseModel):
    team_name: str
    season_label: str
    age_group: str | None
    matches: int


class MatchCountOut(BaseModel):
    match_id: int
    match_date: date
    opponent: str
    moments: int


class TeammateOut(BaseModel):
    id: int
    display_name: str
    shared_moments: int


class PlayerProfileOut(BaseModel):
    id: int
    display_name: str
    shirt_number: str | None
    position: str | None
    photo_url: str | None
    is_primary: bool
    totals: PlayerTotals
    categories: list[TagCount]
    teams: list[TeamSeasonOut]
    per_match: list[MatchCountOut]
    teammates: list[TeammateOut]
    first_match_date: date | None
    latest_match_date: date | None


class PlayerMomentOut(BaseModel):
    event_id: int
    match_id: int
    time_s: float
    duration_s: float
    category: str
    players: list[str]
    note: str
    favourite: bool
    viewed: bool
    team_name: str
    opponent: str
    match_date: date
    season_label: str
    age_group: str | None
    media_id: int | None
    stream_url: str | None
    thumbnail_url: str | None
    match_duration_s: float | None


class PlayerMomentPage(BaseModel):
    total: int
    items: list[PlayerMomentOut]


class Preferences(BaseModel):
    primary_player_id: int | None


class PrimaryPlayerIn(BaseModel):
    player_id: int | None


class FavouriteIn(BaseModel):
    favourite: bool
