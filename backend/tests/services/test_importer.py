"""Import match -> index metadata -> thumbnail (the first vertical slice).

Protects golden rule 4: the library is never silently lost or corrupted, and
the user's original file is never moved, changed or deleted.
"""

import hashlib
import shutil
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Event, MediaAsset, Player
from app.services.importer import (
    DuplicateMedia,
    ImportRequest,
    InvalidImport,
    import_match,
)


def _req(filename: str = "U12 v Rovers 2026-10-18.mp4", **kw: object) -> ImportRequest:
    base: dict[str, object] = dict(
        filename=filename,
        team_name="Riverside U12",
        season_label="2026/27",
        age_group="U12",
        opponent="Rovers",
        match_date=date(2026, 10, 18),
        competition="League",
    )
    base.update(kw)
    return ImportRequest(**base)  # type: ignore[arg-type]


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def test_copies_the_file_into_the_archive_layout_and_indexes_it(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    match = import_match(db, settings, _req())
    asset = db.scalars(select(MediaAsset).where(MediaAsset.match_id == match.id)).one()
    final = settings.archive_root / asset.relative_path
    assert asset.relative_path == (
        "FootballMemories/Matches/2026-27/Riverside U12/2026-10-18 vs Rovers/"
        "U12 v Rovers 2026-10-18.mp4"
    )
    assert _sha(final) == asset.sha256 == _sha(inbox_video)
    assert (asset.width, asset.height, asset.video_codec) == (320, 240, "h264")
    assert asset.duration_s == pytest.approx(4.0, abs=0.15)


def test_leaves_the_original_inbox_file_untouched(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    before = (_sha(inbox_video), inbox_video.stat().st_mtime_ns)
    import_match(db, settings, _req())
    assert (_sha(inbox_video), inbox_video.stat().st_mtime_ns) == before


def test_leaves_no_part_file_behind(db: Session, settings: Settings, inbox_video: Path) -> None:
    import_match(db, settings, _req())
    assert list(settings.archive_root.rglob("*.part")) == []


def test_writes_a_thumbnail_and_records_it(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    match = import_match(db, settings, _req())
    asset = db.scalars(select(MediaAsset).where(MediaAsset.match_id == match.id)).one()
    assert asset.thumbnail_relpath is not None
    thumb = settings.archive_root / asset.thumbnail_relpath
    assert thumb.read_bytes()[:3] == b"\xff\xd8\xff"


def test_importing_the_same_footage_twice_is_refused_and_creates_nothing(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    first = import_match(db, settings, _req())
    shutil.copyfile(inbox_video, settings.import_root / "copy.mp4")
    with pytest.raises(DuplicateMedia) as err:
        import_match(db, settings, _req(filename="copy.mp4", opponent="Someone Else"))
    assert err.value.existing_match_id == first.id
    assert db.scalars(select(MediaAsset)).all().__len__() == 1


def test_never_overwrites_an_existing_different_file_at_the_target_path(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    target_dir = (
        settings.archive_root
        / "FootballMemories/Matches/2026-27/Riverside U12/2026-10-18 vs Rovers"
    )
    target_dir.mkdir(parents=True)
    squatter = target_dir / "U12 v Rovers 2026-10-18.mp4"
    squatter.write_bytes(b"someone else's file")
    match = import_match(db, settings, _req())
    asset = db.scalars(select(MediaAsset).where(MediaAsset.match_id == match.id)).one()
    assert squatter.read_bytes() == b"someone else's file"
    assert asset.relative_path.endswith("U12 v Rovers 2026-10-18 (2).mp4")


def test_a_file_that_is_not_video_is_rejected_and_nothing_is_written(
    db: Session, settings: Settings
) -> None:
    (settings.import_root / "fake.mp4").write_text("not a video")
    with pytest.raises(InvalidImport):
        import_match(db, settings, _req(filename="fake.mp4"))
    assert [p for p in settings.archive_root.rglob("*") if p.is_file()] == []
    assert db.scalars(select(MediaAsset)).all() == []


def test_a_filename_outside_the_inbox_is_rejected(db: Session, settings: Settings) -> None:
    with pytest.raises(InvalidImport):
        import_match(db, settings, _req(filename="../../etc/passwd"))


def test_imports_tags_from_a_sidecar_with_players_and_source_names(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text(
        "time,category,players,note\n"
        "0:01,Save,Sam Moore,low dive\n"
        "0:02.5,GK Distribution,Sam Moore; Alex Smith,\n",
        encoding="utf-8",
    )
    match = import_match(db, settings, _req())
    events = db.scalars(
        select(Event).where(Event.match_id == match.id).order_by(Event.time_s)
    ).all()
    assert [(e.time_s, e.tag.name, e.note) for e in events] == [
        (1.0, "Save", "low dive"),
        (2.5, "GK Distribution", ""),
    ]
    assert sorted(p.display_name for p in events[1].players) == ["Alex Smith", "Sam Moore"]
    assert len(db.scalars(select(Player)).all()) == 2


def test_a_bad_sidecar_aborts_the_import_before_anything_is_copied(
    db: Session, settings: Settings, inbox_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text("time,category\nlater,Save\n")
    with pytest.raises(InvalidImport, match="line 2"):
        import_match(db, settings, _req())
    assert [p for p in settings.archive_root.rglob("*") if p.is_file()] == []


def test_team_keeps_its_history_when_it_changes_age_group_between_seasons(
    db: Session, settings: Settings, inbox_video: Path, other_tiny_video: Path
) -> None:
    first = import_match(db, settings, _req())
    shutil.copyfile(other_tiny_video, settings.import_root / "next.mp4")
    second = import_match(
        db,
        settings,
        _req(
            filename="next.mp4",
            season_label="2027/28",
            age_group="U13",
            match_date=date(2027, 9, 5),
        ),
    )
    assert first.team_id == second.team_id
    assert (first.age_group, second.age_group) == ("U12", "U13")
