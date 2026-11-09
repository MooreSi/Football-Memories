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
