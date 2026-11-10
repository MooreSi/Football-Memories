"""Recorded duration from observed manifests, without fetching video segments."""

import math
from collections.abc import Callable

from app.connectors.hudl_capture import CaptureError, parse_manifest


def recorded_duration(
    manifests: dict[str, str], player: float, fetch: Callable[[str], bytes]
) -> float:
    if isinstance(player, (int, float)) and math.isfinite(player) and player > 0:
        return player
    for address, text in manifests.items():
        parsed = parse_manifest(text, address, max_height=65536)
        if parsed.duration_s:
            return parsed.duration_s
    for address, text in manifests.items():
        for _ in range(3):
            parsed = parse_manifest(text, address, max_height=65536)
            if parsed.duration_s:
                return parsed.duration_s
            if parsed.variant_url is None:
                break
            address = parsed.variant_url
            text = fetch(address).decode()
    raise CaptureError("The recorded video duration is unavailable; no tags were saved.")
