from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


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


CardStyle = Literal["classic", "gold", "silver", "bronze", "emerald", "midnight", "sunset"]


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
    club_name: str | None = Field(default=None, max_length=200)
    card_style: CardStyle | None = None


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
    club_name: str | None = None
    card_style: CardStyle = "classic"
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


class MomentOut(PlayerMomentOut):
    offline: bool


class MomentPage(BaseModel):
    total: int
    items: list[MomentOut]


class FacetOut(BaseModel):
    id: int | None
    name: str
    count: int


class FacetsOut(BaseModel):
    categories: list[FacetOut]
    players: list[FacetOut]
    teams: list[FacetOut]
    seasons: list[FacetOut]
    matches: list[FacetOut]


class PlaylistIn(BaseModel):
    name: str = Field(max_length=200)
    event_ids: list[int] = Field(default_factory=list, max_length=2000)


class PlaylistPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    event_ids: list[int] | None = Field(default=None, max_length=2000)


class PlaylistSummary(BaseModel):
    id: int
    name: str
    item_count: int
    total_seconds: float
    updated_at: datetime


class PlaylistDetail(BaseModel):
    id: int
    name: str
    items: list[MomentOut]


class AppSettingsOut(BaseModel):
    clip_pre_s: float
    clip_post_s: float


class AppSettingsPatch(BaseModel):
    clip_pre_s: float | None = Field(default=None, ge=0, le=60)
    clip_post_s: float | None = Field(default=None, ge=0, le=60)


class FolderHealthOut(BaseModel):
    role: str
    path: str
    exists: bool
    readable: bool
    writable: bool
    free_bytes: int | None
    total_bytes: int | None
    status: str
    messages: list[str]


class MissingFileOut(BaseModel):
    media_id: int
    match_id: int
    opponent: str
    match_date: date
    relative_path: str


class ArchiveSummaryOut(BaseModel):
    indexed_files: int
    indexed_bytes: int
    missing: list[MissingFileOut]


class StorageHealthOut(BaseModel):
    folders: list[FolderHealthOut]
    archive: ArchiveSummaryOut


class BackupOut(BaseModel):
    name: str
    kind: str
    created_at: datetime
    size_bytes: int
    matches: int
    moments: int


class RestoreIn(BaseModel):
    confirm: str


class RestoreOut(BaseModel):
    restored: str
    safety_backup: str


class VerifyResultOut(BaseModel):
    media_id: int
    match_id: int
    opponent: str
    result: str


class VerifyStateOut(BaseModel):
    state: str
    checked: int
    total: int
    started_at: datetime | None
    finished_at: datetime | None
    results: list[VerifyResultOut]


class RelinkOut(BaseModel):
    relinked: int
    still_missing: int


class RebuildOut(BaseModel):
    rebuilt: int
    failed: int


class ReelItemIn(BaseModel):
    event_id: int
    pre_s: float | None = Field(default=None, ge=0, le=120)
    post_s: float | None = Field(default=None, ge=0, le=120)


class ReelIn(BaseModel):
    name: str = Field(max_length=200)
    opening_title: str | None = Field(default=None, max_length=200)
    opening_subtitle: str | None = Field(default=None, max_length=200)
    closing_text: str | None = Field(default=None, max_length=200)
    items: list[ReelItemIn] = Field(default_factory=list, max_length=500)


class ReelPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    opening_title: str | None = Field(default=None, max_length=200)
    opening_subtitle: str | None = Field(default=None, max_length=200)
    closing_text: str | None = Field(default=None, max_length=200)
    items: list[ReelItemIn] | None = Field(default=None, max_length=500)


class ReelItemOut(BaseModel):
    id: int
    position: int
    pre_s: float | None
    post_s: float | None
    start_s: float
    end_s: float
    moment: MomentOut


class ReelSummary(BaseModel):
    id: int
    name: str
    status: str
    progress: float
    error: str | None
    item_count: int
    planned_seconds: float
    output_relpath: str | None
    output_bytes: int | None
    output_duration_s: float | None
    output_width: int | None
    output_height: int | None
    video_url: str | None
    thumbnail_url: str | None
    updated_at: datetime
    rendered_at: datetime | None


class ReelDetail(ReelSummary):
    opening_title: str | None
    opening_subtitle: str | None
    closing_text: str | None
    has_opening_card: bool
    has_closing_card: bool
    items: list[ReelItemOut]


class ScoreCorrectionIn(BaseModel):
    """Spec 210: the owner's score for a Hudl match; both None clears it."""

    match_id: str = Field(min_length=1, max_length=70)
    ours: int | None = Field(ge=0, le=99)
    theirs: int | None = Field(ge=0, le=99)

    @model_validator(mode="after")
    def _both_or_neither(self) -> ScoreCorrectionIn:
        if (self.ours is None) != (self.theirs is None):
            raise ValueError("give both scores, or neither to clear the correction")
        return self


class NoteShapeIn(BaseModel):
    """Spec 230: one line or arrow drawn over the video, in 0..1 frame coordinates."""

    kind: Literal["arrow", "line"]
    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)
    x2: float = Field(ge=0, le=1)
    y2: float = Field(ge=0, le=1)
    colour: str = Field(default="#facc15", pattern=r"^#[0-9a-fA-F]{6}$")


class MomentNoteIn(BaseModel):
    """Spec 230: the owner's note and drawing on one tagged moment; empty clears it."""

    moment_id: str = Field(min_length=1, max_length=300)
    match_id: str = Field(min_length=1, max_length=300)
    time_s: float = Field(ge=0, le=86_400)
    text: str = Field(default="", max_length=2000)
    shapes: list[NoteShapeIn] = Field(default_factory=list, max_length=40)


class WatchingIn(BaseModel):
    """Spec 230: how far into a match the owner has watched."""

    match_id: str = Field(min_length=1, max_length=300)
    position_s: float = Field(ge=0, le=86_400)
    duration_s: float = Field(ge=0, le=86_400)


class AlertsSeenIn(BaseModel):
    """Spec 230: what the owner has already been told about (matches, player moments)."""

    matches: list[Annotated[str, Field(max_length=300)]] = Field(max_length=5000)
    player: str | None = Field(default=None, max_length=200)
    counts: dict[str, Annotated[int, Field(ge=0)]] = Field(default_factory=dict, max_length=5000)
