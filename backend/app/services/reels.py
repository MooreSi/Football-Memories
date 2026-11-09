"""Highlight reels: render ordered moments into one MP4 (spec 080).

Only ever writes under Compilations/. Sources are read, never changed. A
render works in a private folder and replaces the previous output only when
it fully succeeds; a failure leaves the previous output in place.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.config import Settings
from app.models import Event, Match, Reel, ReelItem
from app.services import app_settings
from app.services.moments import moment_load_options
from app.services.paths import sanitize_component
from app.services.players import NotFound, full_match_media

CARD_SECONDS = 3.0
FADE = 0.25
CARD_W, CARD_H = 1920, 1080
CARD_KINDS = ("opening", "closing")
MAX_CARD_BYTES = 15 * 1024 * 1024


class ReelInvalid(ValueError):
    pass


class ReelBusy(RuntimeError):
    pass


def compilations_dir(settings: Settings) -> Path:
    return settings.library_root / "Compilations"


def card_path(settings: Settings, reel_id: int, kind: str) -> Path:
    if kind not in CARD_KINDS:
        raise ReelInvalid("card must be opening or closing")
    return compilations_dir(settings) / ".cards" / f"{reel_id}-{kind}.png"


@dataclass(frozen=True)
class RenderResult:
    relpath: str
    size_bytes: int
    duration_s: float
    width: int
    height: int


@dataclass(frozen=True)
class ClipPlan:
    item: ReelItem
    event: Event
    source: Path | None
    start_s: float
    end_s: float
    has_audio: bool
    height: int | None
    fps: float | None


def plan(db: Session, settings: Settings, reel: Reel) -> list[ClipPlan]:
    timing = app_settings.clip_timing(db)
    out = []
    for item in reel.items:
        e = item.event
        media = full_match_media(e.match)
        pre = item.pre_s if item.pre_s is not None else timing.pre_s
        post = item.post_s if item.post_s is not None else timing.post_s
        duration = media.duration_s if media else e.time_s + e.duration_s + post
        out.append(
            ClipPlan(
                item=item,
                event=e,
                source=settings.archive_root / media.relative_path if media else None,
                start_s=max(0.0, e.time_s - pre),
                end_s=min(duration, e.time_s + e.duration_s + post),
                has_audio=bool(media and media.audio_codec),
                height=media.height if media else None,
                fps=media.fps if media else None,
            )
        )
    return out


def _validate_items(db: Session, items: list[tuple[int, float | None, float | None]]) -> None:
    ids = [i for i, _, _ in items]
    found = set(db.scalars(select(Event.id).where(Event.id.in_(ids))).all())
    missing = [i for i in ids if i not in found]
    if missing:
        raise ReelInvalid(f"unknown moments: {missing}")
    for _, pre, post in items:
        for v in (pre, post):
            if v is not None and not 0 <= v <= 120:
                raise ReelInvalid("clip timing must be between 0 and 120 seconds")


def _set_items(reel: Reel, items: list[tuple[int, float | None, float | None]]) -> None:
    reel.items.clear()
    for pos, (event_id, pre, post) in enumerate(items):
        reel.items.append(ReelItem(event_id=event_id, position=pos, pre_s=pre, post_s=post))


def get(db: Session, reel_id: int) -> Reel:
    reel = db.scalars(
        select(Reel)
        .where(Reel.id == reel_id)
        .options(
            selectinload(Reel.items).selectinload(ReelItem.event).options(*moment_load_options())
        )
    ).first()
    if reel is None:
        raise NotFound(f"reel {reel_id}")
    return reel


TEXT_FIELDS = ("opening_title", "opening_subtitle", "closing_text")


def _apply_text(reel: Reel, text: dict[str, str | None]) -> None:
    for key, value in text.items():
        if key in TEXT_FIELDS:
            setattr(reel, key, (value or "").strip() or None)


def create(
    db: Session,
    name: str,
    items: list[tuple[int, float | None, float | None]],
    text: dict[str, str | None] | None = None,
) -> Reel:
    if not name.strip():
        raise ReelInvalid("a reel needs a name")
    _validate_items(db, items)
    reel = Reel(name=name.strip(), status="draft", progress=0.0)
    _apply_text(reel, text or {})
    db.add(reel)
    db.flush()
    _set_items(reel, items)
    db.commit()
    return get(db, reel.id)


def update(
    db: Session,
    reel_id: int,
    name: str | None,
    items: list[tuple[int, float | None, float | None]] | None,
    text: dict[str, str | None] | None = None,
) -> Reel:
    reel = get(db, reel_id)
    if reel.status in ("rendering", "queued"):
        raise ReelBusy("this reel is being rendered; wait for it to finish")
    if name is not None:
        if not name.strip():
            raise ReelInvalid("a reel needs a name")
        reel.name = name.strip()
    _apply_text(reel, text or {})
    if items is not None:
        _validate_items(db, items)
        _set_items(reel, [])
        db.flush()
        _set_items(reel, items)
    reel.status, reel.error = "draft", None
    reel.updated_at = datetime.now(UTC)
    db.commit()
    return get(db, reel_id)


def queue_render(db: Session, reel_id: int) -> Reel:
    reel = get(db, reel_id)
    if reel.status in ("rendering", "queued"):
        raise ReelBusy("this reel is already being rendered")
    if not reel.items:
        raise ReelInvalid("add at least one clip before rendering")
    reel.status, reel.progress, reel.error = "queued", 0.0, None
    reel.updated_at = datetime.now(UTC)
    db.commit()
    return reel


def recover(db: Session) -> int:
    """After a crash or restart, renders that were in progress start again."""
    stuck = db.scalars(select(Reel).where(Reel.status == "rendering")).all()
    for r in stuck:
        r.status, r.progress = "queued", 0.0
    db.commit()
    return len(stuck)


def delete(db: Session, settings: Settings, reel_id: int) -> None:
    reel = get(db, reel_id)
    if reel.status == "rendering":
        raise ReelBusy("wait for the render to finish before deleting")
    if reel.output_relpath:
        (settings.archive_root / reel.output_relpath).unlink(missing_ok=True)
    for kind in CARD_KINDS:
        card_path(settings, reel.id, kind).unlink(missing_ok=True)
    db.delete(reel)
    db.commit()


# ---------- cards ----------


def _ffmpeg(args: list[str], cwd: Path | None = None, timeout: float = 3600) -> None:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        raise ReelInvalid((proc.stderr or "ffmpeg failed").strip().splitlines()[-1][:300])


def save_card(db: Session, settings: Settings, reel_id: int, kind: str, upload: BinaryIO) -> None:
    get(db, reel_id)
    target = card_path(settings, reel_id, kind)
    target.parent.mkdir(parents=True, exist_ok=True)
    raw = target.with_name(target.name + ".upload")
    part = target.with_name(target.name + ".part.png")
    try:
        data = upload.read(MAX_CARD_BYTES + 1)
        if len(data) > MAX_CARD_BYTES:
            raise ReelInvalid("title card image is too large")
        raw.write_bytes(data)
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(raw)],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        streams = (
            json.loads(probe.stdout or "{}").get("streams", []) if probe.returncode == 0 else []
        )
        if len(streams) != 1 or streams[0].get("codec_name") not in {"png", "mjpeg", "webp"}:
            raise ReelInvalid("the title card must be a PNG, JPEG or WebP image")
        _ffmpeg(
            [
                "-i",
                str(raw),
                "-vf",
                f"scale={CARD_W}:{CARD_H}:force_original_aspect_ratio=decrease,"
                f"pad={CARD_W}:{CARD_H}:(ow-iw)/2:(oh-ih)/2",
                "-frames:v",
                "1",
                str(part),
            ]
        )
        part.replace(target)
    finally:
        raw.unlink(missing_ok=True)
        part.unlink(missing_ok=True)


def remove_card(db: Session, settings: Settings, reel_id: int, kind: str) -> None:
    get(db, reel_id)
    card_path(settings, reel_id, kind).unlink(missing_ok=True)


# ---------- rendering ----------


def _even(n: float) -> int:
    v = int(round(n))
    return v if v % 2 == 0 else v + 1


def _set_progress(factory: sessionmaker[Session], reel_id: int, progress: float) -> None:
    with factory() as db:
        r = db.get(Reel, reel_id)
        if r is not None:
            r.progress = round(progress, 3)
            db.commit()


def process_next(factory: sessionmaker[Session], settings: Settings) -> int | None:
    """Render the oldest queued reel. Returns its id, or None when nothing is queued."""
    with factory() as db:
        reel = db.scalars(
            select(Reel).where(Reel.status == "queued").order_by(Reel.updated_at, Reel.id).limit(1)
        ).first()
        if reel is None:
            return None
        reel.status, reel.progress, reel.error = "rendering", 0.0, None
        db.commit()
        reel = get(db, reel.id)
        clips = plan(db, settings, reel)
        reel_id, name = reel.id, reel.name
    try:
        result = _render(factory, settings, reel_id, name, clips)
    except Exception as exc:  # noqa: BLE001 - every failure is reported on the reel
        with factory() as db:
            r = db.get(Reel, reel_id)
            if r is not None:
                r.status, r.error = "failed", str(exc) or exc.__class__.__name__
                db.commit()
        return reel_id
    with factory() as db:
        r = db.get(Reel, reel_id)
        if r is not None:
            old = r.output_relpath
            r.output_relpath = result.relpath
            r.output_bytes, r.output_duration_s = result.size_bytes, result.duration_s
            r.output_width, r.output_height = result.width, result.height
            r.status, r.progress, r.error = "done", 1.0, None
            r.rendered_at = datetime.now(UTC)
            db.commit()
            if old and old != r.output_relpath:
                (settings.archive_root / old).unlink(missing_ok=True)
    return reel_id


def _render(
    factory: sessionmaker[Session],
    settings: Settings,
    reel_id: int,
    name: str,
    clips: list[ClipPlan],
) -> RenderResult:
    for c in clips:
        if c.source is None or not c.source.is_file():
            m: Match = c.event.match
            raise ReelInvalid(
                f"the video for vs {m.opponent} ({m.match_date.isoformat()}) is missing; "
                "restore it or run Find moved files"
            )
    height = _even(max((c.height or 720) for c in clips))
    width = _even(height * 16 / 9)
    fps = min(60, max(1, round(max((c.fps or 30) for c in clips))))
    vf_base = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps},format=yuv420p"
    )
    enc = [
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-video_track_timescale",
        "90000",
    ]

    out_dir = compilations_dir(settings)
    work = out_dir / f".work-{reel_id}"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    try:
        segments: list[str] = []
        cards = [card_path(settings, reel_id, k) for k in CARD_KINDS]
        opening, closing = (p if p.is_file() else None for p in cards)
        steps = len(clips) + (opening is not None) + (closing is not None) + 1
        done = 0

        def card_segment(img: Path, label: str) -> None:
            seg = f"{len(segments):03d}-{label}.mp4"
            _ffmpeg(
                [
                    "-loop",
                    "1",
                    "-framerate",
                    str(fps),
                    "-t",
                    str(CARD_SECONDS),
                    "-i",
                    str(img),
                    "-f",
                    "lavfi",
                    "-t",
                    str(CARD_SECONDS),
                    "-i",
                    "anullsrc=r=48000:cl=stereo",
                    "-map",
                    "0:v",
                    "-map",
                    "1:a",
                    "-vf",
                    f"{vf_base},fade=t=in:st=0:d=0.4,fade=t=out:st={CARD_SECONDS - 0.4}:d=0.4",
                    *enc,
                    "-t",
                    str(CARD_SECONDS),
                    seg,
                ],
                cwd=work,
            )
            segments.append(seg)

        if opening:
            card_segment(opening, "opening")
            done += 1
            _set_progress(factory, reel_id, done / steps)
        for c in clips:
            dur = max(0.1, c.end_s - c.start_s)
            fade_out = max(0.0, dur - FADE)
            seg = f"{len(segments):03d}-clip.mp4"
            args = ["-ss", f"{c.start_s:.3f}", "-t", f"{dur:.3f}", "-i", str(c.source)]
            if c.has_audio:
                amap = "0:a:0"
            else:
                args += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
                amap = "1:a:0"
            args += [
                "-map",
                "0:v:0",
                "-map",
                amap,
                "-vf",
                f"{vf_base},fade=t=in:st=0:d={FADE},fade=t=out:st={fade_out:.3f}:d={FADE}",
                "-af",
                f"aresample=48000,aformat=channel_layouts=stereo,"
                f"afade=t=in:st=0:d={FADE},afade=t=out:st={fade_out:.3f}:d={FADE}",
                *enc,
                "-t",
                f"{dur:.3f}",
                seg,
            ]
            _ffmpeg(args, cwd=work)
            segments.append(seg)
            done += 1
            _set_progress(factory, reel_id, done / steps)
        if closing:
            card_segment(closing, "closing")
            done += 1
            _set_progress(factory, reel_id, done / steps)

        (work / "list.txt").write_text("".join(f"file '{s}'\n" for s in segments))
        _ffmpeg(
            [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                "list.txt",
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                "out.mp4",
            ],
            cwd=work,
        )

        slug = re.sub(r"\s+", " ", sanitize_component(name))[:80]
        final = out_dir / f"{slug} ({reel_id}).mp4"
        part = final.with_name(final.name + ".part")
        shutil.move(str(work / "out.mp4"), part)
        os.replace(part, final)
        probe = json.loads(
            subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-print_format",
                    "json",
                    "-show_format",
                    "-show_streams",
                    str(final),
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=60,
            ).stdout
        )
        video = next(s for s in probe["streams"] if s.get("codec_type") == "video")
        return RenderResult(
            relpath=final.relative_to(settings.archive_root).as_posix(),
            size_bytes=final.stat().st_size,
            duration_s=float(probe["format"]["duration"]),
            width=int(video["width"]),
            height=int(video["height"]),
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)
