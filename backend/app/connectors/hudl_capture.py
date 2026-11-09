"""Read-only Hudl capture contracts; no credentials or remote URLs are persisted."""

from __future__ import annotations

import copy
import csv
import hashlib
import math
import os
import re
import shutil
import subprocess
import tempfile
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit

from app.services.media import MediaError, probe
from app.services.paths import sanitize_component


class CaptureError(ValueError):
    """Safe, user-facing capture failure (never includes response bodies or URLs)."""


@dataclass(frozen=True)
class Moment:
    source_event_id: str
    time_s: float
    duration_s: float
    category: str
    players: tuple[str, ...]


@dataclass(frozen=True)
class Manifest:
    variant_url: str | None = field(default=None, repr=False)
    resources: tuple[str, ...] = field(default=(), repr=False)
    local_playlist: str = ""
    duration_s: float = 0


def clip_tag_padding(
    payloads: list[dict[str, Any]], video_id: str, duration_s: float
) -> list[dict[str, Any]]:
    if not math.isfinite(duration_s) or duration_s <= 0:
        raise CaptureError("The player has not reported a recorded video duration.")
    clipped = copy.deepcopy(payloads)
    for payload in clipped:
        for session in (payload.get("data") or {}).get("taggingSessions", {}).get("items", []):
            if session.get("videoId") != video_id:
                continue
            for moment in session.get("moments", {}).get("items", []):
                start, end = moment.get("startTimeMs"), moment.get("endTimeMs")
                if type(start) in (int, float) and type(end) in (int, float):
                    # Sportscode clip padding can extend beyond the playable
                    # interval. Strict parsing still rejects reversed/nonfinite times.
                    moment["startTimeMs"] = max(start, 0)
                    moment["endTimeMs"] = min(end, duration_s * 1000)
    return clipped


def parse_moments(
    payloads: list[dict[str, Any]], video_id: str, player_codes: set[str]
) -> list[Moment]:
    result: dict[str, Moment] = {}
    for payload in payloads:
        if payload.get("errors"):
            raise CaptureError("Hudl could not return the tag data; reconnect before capturing.")
        sessions = payload.get("data", {}).get("taggingSessions", {}).get("items", [])
        for session in sessions:
            if session.get("videoId") != video_id:
                continue
            if session.get("dataSource", {}).get("feedType") != "SportsCode":
                raise CaptureError("This tagging format is unsupported; no tags were saved.")
            if session.get("taggingSessionMetadata", {}).get("isSyncedToVideo") is not True:
                raise CaptureError("The tag timeline is not synced to video; no tags were saved.")
            items = session.get("moments", {}).get("items", [])
            if session.get("moments", {}).get("totalCount", len(items)) != len(items):
                raise CaptureError("The tag data is incomplete; no tags were saved.")
            for item in items:
                start, end = item.get("startTimeMs"), item.get("endTimeMs")
                if (
                    type(start) not in (float, int)
                    or type(end) not in (float, int)
                    or not math.isfinite(start)
                    or not math.isfinite(end)
                    or start < 0
                    or end < start
                ):
                    raise CaptureError("Invalid moment timing; no tags were saved.")
                identity = item.get("momentId") or item.get("id")
                if not isinstance(identity, str) or not identity or not session.get("id"):
                    raise CaptureError("A moment has no stable identity; no tags were saved.")
                codes = [
                    value
                    for tag in item.get("tags", [])
                    if tag.get("key") == "HUDL_CODE"
                    for value in tag.get("values", [])
                    if isinstance(value, str) and value.strip()
                ]
                if not codes:
                    raise CaptureError("A moment has no Sportscode code; no tags were saved.")
                for index, code in enumerate(codes):
                    event_id = f"{session['id']}:{identity}"
                    if len(codes) > 1:
                        event_id += f":{index}"
                    moment = Moment(
                        event_id,
                        start / 1000,
                        (end - start) / 1000,
                        "Player involvement" if code in player_codes else code,
                        (code,) if code in player_codes else (),
                    )
                    if event_id in result and result[event_id] != moment:
                        raise CaptureError("Tag data changed during capture; start again.")
                    result[event_id] = moment
    return sorted(result.values(), key=lambda moment: (moment.time_s, moment.source_event_id))


def media_url(url: str) -> str:
    try:
        parsed = urlsplit(url)
        valid = (
            parsed.scheme == "https"
            and parsed.hostname is not None
            and parsed.hostname.endswith(".hudl.com")
            and parsed.port in (None, 443)
            and not parsed.username
            and not parsed.password
            and not parsed.fragment
            and not any(char.isspace() for char in url)
        )
    except ValueError:
        valid = False
    if not valid:
        raise CaptureError("Unsupported media address; capture stopped.")
    return url


def _attributes(line: str) -> dict[str, str]:
    return dict(re.findall(r'([A-Z0-9-]+)=("[^"]*"|[^,]*)', line.split(":", 1)[1]))


def parse_manifest(text: str, base_url: str, *, max_height: int) -> Manifest:
    media_url(base_url)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines or lines[0] != "#EXTM3U" or len(text) > 2_000_000:
        raise CaptureError("Hudl did not return a valid video manifest.")
    for line in lines:
        if line.startswith(("#EXT-X-BYTERANGE", "#EXT-X-PART", "#EXT-X-SESSION-KEY")):
            raise CaptureError("This video manifest format is unsupported.")
        if line.startswith("#EXT-X-KEY") and line != "#EXT-X-KEY:METHOD=NONE":
            raise CaptureError("This video is encrypted; capture stopped.")
        if line.startswith("#EXT-X-MEDIA:") and "URI=" in line:
            raise CaptureError("Separate audio/video playlists are unsupported.")
    variants: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        if line.startswith("#EXT-X-STREAM-INF:"):
            attrs = _attributes(line)
            try:
                height = int(attrs["RESOLUTION"].split("x")[1])
                bandwidth = int(attrs["BANDWIDTH"])
                uri = lines[index + 1]
                if uri.startswith("#"):
                    raise ValueError
                address = media_url(urljoin(base_url, uri))
            except (ValueError, IndexError, KeyError):
                raise CaptureError("This video rendition description is unsupported.") from None
            if height <= max_height:
                variants.append((bandwidth, address))
    if any(line.startswith("#EXT-X-STREAM-INF:") for line in lines):
        if not variants:
            raise CaptureError("No video rendition meets the chosen maximum height.")
        return Manifest(variant_url=max(variants)[1])
    if "#EXT-X-ENDLIST" not in lines:
        raise CaptureError("Only complete recorded matches can be captured.")
    resources: list[str] = []
    local: list[str] = []
    duration = 0.0
    pending_segment = False
    for line in lines:
        if line.startswith("#EXT-X-MAP:"):
            attrs = _attributes(line)
            if set(attrs) != {"URI"}:
                raise CaptureError("This initialization segment format is unsupported.")
            address = media_url(urljoin(base_url, attrs["URI"].strip('"')))
            local.append(f'#EXT-X-MAP:URI="asset-{len(resources)}.bin"')
            resources.append(address)
        elif line.startswith("#EXTINF:"):
            try:
                seconds = float(line.split(":", 1)[1].split(",", 1)[0])
                if not math.isfinite(seconds) or seconds <= 0 or pending_segment:
                    raise ValueError
            except ValueError:
                raise CaptureError("Invalid segment duration; capture stopped.") from None
            duration += seconds
            local.append(f"#EXTINF:{seconds},")
            pending_segment = True
        elif not line.startswith("#"):
            if not pending_segment:
                raise CaptureError("A video segment has no duration; capture stopped.")
            local.append(f"asset-{len(resources)}.bin")
            resources.append(media_url(urljoin(base_url, line)))
            pending_segment = False
        else:
            if "URI=" in line or "http" in line.lower():
                raise CaptureError("This manifest contains an unsupported external reference.")
            local.append(line)
    if not resources or pending_segment or duration <= 0:
        raise CaptureError("The video manifest is incomplete.")
    return Manifest(
        resources=tuple(resources), local_playlist="\n".join(local) + "\n", duration_s=duration
    )


def save_capture(
    source: Path, directory: Path, name: str, moments: list[Moment], duration_s: float
) -> Path:
    try:
        info = probe(source)
    except MediaError:
        raise CaptureError(
            "The captured video could not be verified; no match was published."
        ) from None
    if not math.isfinite(duration_s) or duration_s <= 0 or abs(info.duration_s - duration_s) > 1:
        raise CaptureError("Captured video duration does not match the complete playlist.")
    if any(moment.time_s >= info.duration_s for moment in moments):
        raise CaptureError("Moment timing extends beyond this video; no match was published.")
    directory.mkdir(parents=True, exist_ok=True)
    stem = sanitize_component(name)
    target = directory / f"{stem}.mp4"
    sidecar = target.with_suffix(".tags.csv")
    if target.exists() or sidecar.exists():
        raise CaptureError("The capture destination already exists; choose a new name.")
    # Staging is on the destination filesystem. Hard links publish exclusively;
    # another writer cannot win a race and have its files overwritten.
    with tempfile.TemporaryDirectory(prefix=".hudl-capture-", dir=directory) as scratch:
        temp_video = Path(scratch) / "capture.mp4"
        temp_tags = Path(scratch) / "capture.csv"
        shutil.copyfile(source, temp_video)
        with source.open("rb") as original, temp_video.open("rb") as copied:
            if (
                hashlib.file_digest(original, "sha256").digest()
                != hashlib.file_digest(copied, "sha256").digest()
            ):
                raise CaptureError("Capture copy checksum mismatch; no match was published.")
        with temp_tags.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["time", "category", "players", "duration", "note", "source_event_id"])
            writer.writerows(
                [
                    [
                        moment.time_s,
                        moment.category,
                        "; ".join(moment.players),
                        round(min(moment.duration_s, info.duration_s - moment.time_s), 6),
                        "",
                        moment.source_event_id,
                    ]
                    for moment in moments
                ]
            )
        created: list[Path] = []
        try:
            os.link(temp_tags, sidecar)
            created.append(sidecar)
            os.link(temp_video, target)
        except FileExistsError:
            for path in created:
                path.unlink()
            raise CaptureError(
                "The capture destination already exists; choose a new name."
            ) from None
        except OSError:
            for path in created:
                path.unlink()
            raise CaptureError(
                "Could not publish the capture; check disk space and permissions."
            ) from None
    return target


def capture_hls(
    fetch: Callable[[str], bytes],
    master_url: str,
    scratch: Path,
    *,
    max_height: int,
    progress: Callable[[int, int], None] = lambda done, total: None,
) -> tuple[Path, float]:
    def get(address: str) -> bytes:
        try:
            data = fetch(media_url(address))
        except CaptureError:
            raise
        except Exception:
            raise CaptureError(
                "Video transfer failed; reconnect and start a new capture."
            ) from None
        if not data:
            raise CaptureError("An empty video response was received; capture stopped.")
        return data

    address = master_url
    manifest = None
    for _ in range(3):
        try:
            text = get(address).decode("utf-8-sig")
        except UnicodeDecodeError:
            raise CaptureError("Hudl did not return a readable video manifest.") from None
        manifest = parse_manifest(text, address, max_height=max_height)
        if manifest.variant_url is None:
            break
        address = manifest.variant_url
    else:
        raise CaptureError("Too many nested video manifests; capture stopped.")
    transferred = 0
    for index, resource in enumerate(manifest.resources):
        # Leave room for local remuxing and publication as well as this segment.
        if shutil.disk_usage(scratch).free < transferred * 2 + 100_000_000:
            raise CaptureError("Not enough free disk space to finish and verify this capture.")
        data = get(resource)
        with (scratch / f"asset-{index}.bin").open("xb") as stream:
            stream.write(data)
        transferred += len(data)
        progress(index + 1, len(manifest.resources))
    playlist = scratch / "local.m3u8"
    playlist.write_text(manifest.local_playlist, encoding="utf-8")
    output = scratch / "capture.mp4"
    try:
        process = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-n",
                "-protocol_whitelist",
                "file",
                "-allowed_extensions",
                "ALL",
                "-allowed_segment_extensions",
                "ALL",
                "-extension_picky",
                "0",
                "-i",
                str(playlist),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(output),
            ],
            capture_output=True,
            timeout=1800,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise CaptureError("Local video assembly failed; no capture was published.") from None
    if process.returncode != 0:
        raise CaptureError("Local video assembly failed; no capture was published.")
    return output, manifest.duration_s
