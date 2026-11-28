"""How many ffmpeg encodes to run at once without running out of memory (spec 840).

Shared by highlight reels (`services/reels.py`), Hudl/Veo reel assembly
(`connectors/hudl_batch.py`) and Veo highlight cuts (`connectors/veo/_reels.py`).
"""

from __future__ import annotations

from pathlib import Path

# Spec 840, measured on the M4 mini: libx264 (fast, default threads) peaks near 740 MB per
# 1080p encode and 240 MB at 540p; three encodes at once is where the gain flattens (about
# 1.3x); capping ffmpeg's own threads made it slower. Hosted backends have a 1 GiB cap.
MAX_PARALLEL_ENCODES = 3
CPUS_PER_ENCODE = 3
ENCODE_BYTES_1080P = 760 * 1024**2
MIN_ENCODE_BYTES = 240 * 1024**2
RESERVED_BYTES = 300 * 1024**2  # the backend itself, ffprobe and the concat step
CGROUP_MEMORY_MAX = Path("/sys/fs/cgroup/memory.max")


def memory_limit(path: Path = CGROUP_MEMORY_MAX) -> int | None:
    """The container's memory limit in bytes, or None when there is none or it is unknown."""
    try:
        return int(path.read_text().strip())
    except (OSError, ValueError):
        return None


def parallel_encodes(
    parts: int, width: int, height: int, cpus: int | None, memory_bytes: int | None
) -> int:
    """How many reel parts to encode at once without running the backend out of memory."""
    n = min(MAX_PARALLEL_ENCODES, parts, (cpus or 1) // CPUS_PER_ENCODE)
    if memory_bytes is not None:
        per = max(MIN_ENCODE_BYTES, ENCODE_BYTES_1080P * width * height / (1920 * 1080))
        n = min(n, int((memory_bytes - RESERVED_BYTES) // per))
    return max(1, n)
