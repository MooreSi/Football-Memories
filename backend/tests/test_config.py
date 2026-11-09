"""Folder settings are always absolute, so code that changes the working
directory (ffmpeg runs in a scratch folder) cannot misread them."""

from pathlib import Path

from app.config import Settings


def test_relative_folder_settings_are_resolved_to_absolute_paths() -> None:
    s = Settings(archive_root=Path("../data/archive"), import_root=Path("data/inbox"))
    assert s.archive_root.is_absolute() and s.import_root.is_absolute()
    assert s.archive_root == (Path.cwd() / "../data/archive").resolve()


def test_absolute_folder_settings_are_kept(tmp_path: Path) -> None:
    assert Settings(archive_root=tmp_path, import_root=tmp_path).archive_root == tmp_path.resolve()
