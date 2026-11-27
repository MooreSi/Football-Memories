"""Video Lab: a bounded analysis window cut from the open Hudl stream's segments.

Uses the same prepared stream as the in-app player and moment exports, fetching
only the segments that cover the chosen window. Nothing is written to the
user's downloads; the verified clip waits in the helper cache under a random
ticket until the gateway imports it.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_exports import _AUDIO, _HLS_INPUT, _VIDEO, _ffmpeg, _segments
from app.services.media import probe
from app.services.publish import publish_new

if TYPE_CHECKING:
    from ._account import BrowserConnection

MAX_WINDOW_S = 600.1


def check_window(window: dict[str, Any] | None) -> tuple[float, float]:
    start = float((window or {}).get("start_s", 0))
    duration = float((window or {}).get("duration_s", 0))
    if not 0 <= start or not 0 < duration <= MAX_WINDOW_S:
        raise CaptureError("Choose an analysis window of at most ten minutes.")
    return start, duration


def analysis_root(connection: BrowserConnection) -> Path:
    return connection.output.parent / ".hudl-account" / "analysis"


def export_window(
    connection: BrowserConnection, stream: str, playlist: str, start: float, duration: float
) -> None:
    """Runs on its own thread: segment fetches queue on the single account worker."""
    try:
        identity = connection._stream_match
        header, segments = _segments(playlist)
        end = start + duration
        chosen = [s for s in segments if s[0] < end and s[0] + s[1] > start]
        if not chosen or chosen[-1][0] + chosen[-1][1] < end - 0.1:
            raise CaptureError("The analysis window extends past this match.")
        ticket = secrets.token_hex(16)
        output = analysis_root(connection) / ticket
        output.mkdir(parents=True, exist_ok=False)
        with tempfile.TemporaryDirectory(prefix=".hudl-analysis-", dir=output) as folder:
            scratch = Path(folder)
            # fMP4 streams carry an #EXT-X-MAP init segment as its own asset; without
            # it no media segment decodes and ffmpeg fails the whole window.
            maps = {
                int(init.split("asset-", 1)[1].split(".bin", 1)[0]) for *_, init in chosen if init
            }
            needed = sorted(maps | {s[2] for s in chosen})
            for done, index in enumerate(needed, start=1):
                connection._set_progress("Fetching the selected footage", 1, done - 1, len(needed))
                data = connection.resource(stream, str(index))[0]
                if not data:
                    raise CaptureError("An empty video segment was received; nothing was saved.")
                (scratch / f"asset-{index}.bin").write_bytes(data)
            lines, last_map = list(header), None
            for _, length, index, init in chosen:
                if init and init != last_map:
                    lines.append(init)
                    last_map = init
                lines += [f"#EXTINF:{length},", f"asset-{index}.bin"]
            lines.append("#EXT-X-ENDLIST")
            source = scratch / "window.m3u8"
            source.write_text("\n".join(lines) + "\n")
            connection.report("working", "Encoding the analysis window…")
            with connection._lock:
                connection._progress = None
            partial = scratch / "sample.mp4"
            # Output-side -ss: input-side seeking on a playlist that starts mid-match
            # lands late (synthetic 2 s window came out 1.4 s). Decoding at most one
            # extra segment is cheap and frame accurate.
            ok = _ffmpeg(
                [
                    *_HLS_INPUT,
                    "-i",
                    str(source),
                    "-ss",
                    f"{max(0.0, start - chosen[0][0]):.3f}",
                    "-t",
                    f"{duration:.3f}",
                    "-map",
                    "0:v:0",
                    "-map",
                    "0:a?",
                    *_VIDEO,
                    *_AUDIO,
                    "-movflags",
                    "+faststart",
                    str(partial),
                ]
            )
            if not ok or not partial.is_file():
                raise CaptureError("The analysis clip could not be encoded; nothing was saved.")
            info = probe(partial)
            if info.video_codec != "h264" or abs(info.duration_s - duration) > 0.5:
                raise CaptureError("The analysis clip was incomplete; nothing was published.")
            target = output / "sample.mp4"
            publish_new(partial, target)
        with target.open("rb") as stream_file:
            checksum = hashlib.file_digest(stream_file, "sha256").hexdigest()
        title = connection.catalogue.find(identity).get("title")
        metadata = {
            "match_id": identity,
            "title": title if isinstance(title, str) and title else "Hudl match",
            "duration_s": info.duration_s,
            "source_offset_s": start,
            "sha256": checksum,
            "size_bytes": target.stat().st_size,
            # No Hudl tags: the worker imports sample tags as Veo teacher records,
            # which would misstate where a coach's Sportscode code came from.
            "tags": {},
        }
        with (output / "info.json").open("x") as f:
            json.dump(metadata, f, allow_nan=False)
        with connection._lock:
            connection._state.update(analysis_ticket=ticket, match_id=identity)
        connection.report("done", "Analysis window ready for Video Lab.")
    except CaptureError as error:
        connection.report("error", str(error))
    except Exception as error:
        from ._batch import _cause

        connection.report(
            "error",
            f"Analysis clip stopped ({_cause(error)}). The stream and your files are unchanged.",
        )
    finally:
        with connection._lock:
            connection._pending -= 1
            connection._progress = None
