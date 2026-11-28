"""How many reel parts are encoded at once (spec 840).

Numbers come from measurements on the M4 mini (spec 840): libx264 peaks near 240 MB per
encode at 540p and 740 MB at 1080p, gains flatten after three encodes at once, and hosted
backends run with a 1 GiB memory cap.
"""

from pathlib import Path

import pytest

from app.services.reels import memory_limit, parallel_encodes

GIB = 1024**3


def test_a_ten_core_mac_with_no_memory_limit_encodes_three_at_once() -> None:
    assert parallel_encodes(parts=8, width=1920, height=1080, cpus=10, memory_bytes=None) == 3


def test_never_more_encodes_than_parts() -> None:
    assert parallel_encodes(parts=2, width=1920, height=1080, cpus=10, memory_bytes=None) == 2
    assert parallel_encodes(parts=1, width=1920, height=1080, cpus=10, memory_bytes=None) == 1


def test_a_small_machine_stays_one_at_a_time() -> None:
    assert parallel_encodes(parts=8, width=960, height=540, cpus=2, memory_bytes=None) == 1
    assert parallel_encodes(parts=8, width=960, height=540, cpus=None, memory_bytes=None) == 1


def test_1080p_in_a_hosted_1_gib_container_stays_one_at_a_time() -> None:
    # Two 740 MB encodes would get the whole backend killed for running out of memory.
    assert parallel_encodes(parts=8, width=1920, height=1080, cpus=10, memory_bytes=GIB) == 1


def test_smaller_reels_fit_more_encodes_in_the_same_memory() -> None:
    assert parallel_encodes(parts=8, width=1280, height=720, cpus=10, memory_bytes=GIB) == 2
    assert parallel_encodes(parts=8, width=960, height=540, cpus=10, memory_bytes=GIB) == 3


def test_a_tiny_memory_limit_still_encodes_one_part() -> None:
    assert parallel_encodes(parts=8, width=960, height=540, cpus=10, memory_bytes=1) == 1


@pytest.mark.parametrize(("text", "expected"), [("1073741824\n", GIB), ("max\n", None)])
def test_reads_the_cgroup_memory_limit(tmp_path: Path, text: str, expected: int | None) -> None:
    f = tmp_path / "memory.max"
    f.write_text(text)
    assert memory_limit(f) == expected


def test_no_cgroup_file_means_no_known_limit(tmp_path: Path) -> None:
    assert memory_limit(tmp_path / "missing") is None


def test_an_unreadable_limit_is_treated_as_unknown(tmp_path: Path) -> None:
    f = tmp_path / "memory.max"
    f.write_text("garbage")
    assert memory_limit(f) is None
