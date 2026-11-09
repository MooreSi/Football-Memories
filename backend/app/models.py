"""Relational schema. Documented in ARCHITECTURE.md ("Data model").

Portable types only (works on PostgreSQL and on SQLite for the fast test run).
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("name", name="uq_teams_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    club: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Season(Base):
    __tablename__ = "seasons"
    __table_args__ = (UniqueConstraint("label", name="uq_seasons_label"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(40))


class TeamSeason(Base):
    """A team's age group is per season, so a team moving U12 -> U13 keeps its history."""

    __tablename__ = "team_seasons"

    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), primary_key=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), primary_key=True)
    age_group: Mapped[str | None] = mapped_column(String(40))


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("display_name", name="uq_players_display_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str] = mapped_column(String(200))
    shirt_number: Mapped[str | None] = mapped_column(String(10))
    position: Mapped[str | None] = mapped_column(String(40))
    photo_relpath: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("source", "source_match_id", name="uq_matches_source_id"),
        Index("ix_matches_team_date", "team_id", "match_date"),
        Index("ix_matches_season", "season_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))
    age_group: Mapped[str | None] = mapped_column(String(40))
    opponent: Mapped[str] = mapped_column(String(200))
    match_date: Mapped[date] = mapped_column(Date)
    competition: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(40))
    source_match_id: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    team: Mapped[Team] = relationship()
    season: Mapped[Season] = relationship()
    media: Mapped[list[MediaAsset]] = relationship(back_populates="match")
    events: Mapped[list[Event]] = relationship(back_populates="match", order_by="Event.time_s")


class MediaAsset(Base):
    """A local media file. Paths are relative to ARCHIVE_ROOT so the archive can move."""

    __tablename__ = "media_assets"
    __table_args__ = (UniqueConstraint("sha256", name="uq_media_sha256"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # full_match | clip | compilation
    relative_path: Mapped[str] = mapped_column(Text)
    original_filename: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    duration_s: Mapped[float] = mapped_column(Float)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    fps: Mapped[float | None] = mapped_column(Float)
    video_codec: Mapped[str | None] = mapped_column(String(40))
    audio_codec: Mapped[str | None] = mapped_column(String(40))
    bitrate: Mapped[int | None] = mapped_column(Integer)
    container: Mapped[str | None] = mapped_column(String(80))
    thumbnail_relpath: Mapped[str | None] = mapped_column(Text)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    match: Mapped[Match] = relationship(back_populates="media")


class TagDefinition(Base):
    """Source tag names are kept exactly as written; there is no fixed taxonomy."""

    __tablename__ = "tag_definitions"
    __table_args__ = (UniqueConstraint("source", "name", name="uq_tag_source_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(40))


event_players = Table(
    "event_players",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("player_id", ForeignKey("players.id"), primary_key=True, index=True),
)


class Event(Base):
    """A tagged moment: a point in a match, not a separate file (brief section 14)."""

    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("match_id", "source", "source_event_id", name="uq_events_identity"),
        Index("ix_events_match_time", "match_id", "time_s"),
        Index("ix_events_tag", "tag_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag_definitions.id"))
    time_s: Mapped[float] = mapped_column(Float)
    duration_s: Mapped[float] = mapped_column(Float, default=0.0)
    note: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(40))
    source_event_id: Mapped[str] = mapped_column(String(200))

    match: Mapped[Match] = relationship(back_populates="events")
    tag: Mapped[TagDefinition] = relationship()
    players: Mapped[list[Player]] = relationship(secondary=event_players)


class EventMark(Base):
    """Per-moment personal state: favourite and when it was first watched."""

    __tablename__ = "event_marks"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    favourite: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Preference(Base):
    """Application preferences that must survive restarts (e.g. the primary player)."""

    __tablename__ = "preferences"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text)


class Playlist(Base):
    __tablename__ = "playlists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    items: Mapped[list[PlaylistItem]] = relationship(
        back_populates="playlist", order_by="PlaylistItem.position", cascade="all, delete-orphan"
    )


class PlaylistItem(Base):
    """One moment in a playlist. Deleting a playlist never deletes the moment."""

    __tablename__ = "playlist_items"
    __table_args__ = (
        UniqueConstraint("playlist_id", "event_id", name="uq_playlist_event"),
        Index("ix_playlist_items_order", "playlist_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    playlist_id: Mapped[int] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)

    playlist: Mapped[Playlist] = relationship(back_populates="items")
    event: Mapped[Event] = relationship()


class Reel(Base):
    """A highlight reel: ordered moments rendered into one MP4 (spec 080)."""

    __tablename__ = "reels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    opening_title: Mapped[str | None] = mapped_column(String(200))
    opening_subtitle: Mapped[str | None] = mapped_column(String(200))
    closing_text: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    error: Mapped[str | None] = mapped_column(Text)
    output_relpath: Mapped[str | None] = mapped_column(Text)
    output_bytes: Mapped[int | None] = mapped_column(BigInteger)
    output_duration_s: Mapped[float | None] = mapped_column(Float)
    output_width: Mapped[int | None] = mapped_column(Integer)
    output_height: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    rendered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items: Mapped[list[ReelItem]] = relationship(
        back_populates="reel", order_by="ReelItem.position", cascade="all, delete-orphan"
    )


class ReelItem(Base):
    """One clip in a reel. pre_s/post_s override the global clip timing for this clip."""

    __tablename__ = "reel_items"
    __table_args__ = (Index("ix_reel_items_order", "reel_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    reel_id: Mapped[int] = mapped_column(ForeignKey("reels.id", ondelete="CASCADE"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    pre_s: Mapped[float | None] = mapped_column(Float)
    post_s: Mapped[float | None] = mapped_column(Float)

    reel: Mapped[Reel] = relationship(back_populates="items")
    event: Mapped[Event] = relationship()
