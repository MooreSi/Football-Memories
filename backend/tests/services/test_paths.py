"""safe_join is the only way a user-supplied name becomes a filesystem path.
It protects against path traversal through the API (brief section 13/21)."""

from pathlib import Path

import pytest

from app.services.paths import UnsafePath, safe_join, sanitize_component


def test_joins_a_plain_relative_name_inside_the_root(tmp_path: Path) -> None:
    assert safe_join(tmp_path, "games/a.mp4") == (tmp_path / "games" / "a.mp4").resolve()


@pytest.mark.parametrize("name", ["../secret", "a/../../secret", "/etc/passwd", "", "."])
def test_rejects_a_name_that_escapes_or_is_not_a_file_name(tmp_path: Path, name: str) -> None:
    with pytest.raises(UnsafePath):
        safe_join(tmp_path, name)


def test_rejects_a_symlink_that_points_outside_the_root(tmp_path: Path) -> None:
    root = tmp_path / "root"
    root.mkdir()
    outside = tmp_path / "outside.mp4"
    outside.write_bytes(b"x")
    (root / "link.mp4").symlink_to(outside)
    with pytest.raises(UnsafePath):
        safe_join(root, "link.mp4")


def test_sanitize_component_removes_separators_and_reserved_characters() -> None:
    assert sanitize_component('U12 / Rovers: "Final"?') == "U12 - Rovers - Final"


def test_sanitize_component_never_returns_a_dot_name_or_empty() -> None:
    assert sanitize_component("..") == "untitled"
    assert sanitize_component("   ") == "untitled"
