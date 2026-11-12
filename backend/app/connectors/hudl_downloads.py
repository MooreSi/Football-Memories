"""Where the desktop helper saves downloads, and Trash-only removal of them.

Owner request (2026-11-10): choose the download folder and delete files from
Settings > Storage. The default stays the app inbox (golden rule 5). Deletion
moves one named file to the macOS Trash and never replaces anything there, so
it can be undone from Finder. Owner request (2026-11-12): Downloaded > Delete
moves a file the download index lists, including in moments/ and reels/.
"""

from __future__ import annotations

import json
import os
import platform
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError

_SHOWN = {".mp4", ".mov", ".m4v", ".mkv", ".zip", ".csv"}
_NAME = re.compile(r"[^/\\\x00]{1,255}")


_PICK_WINDOWS = (
    "Add-Type -AssemblyName System.Windows.Forms; "
    "$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
    "$d.Description = 'Choose where Football Memories saves downloads'; "
    "$d.SelectedPath = $env:FM_CURRENT_FOLDER; "
    "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }"
)
_RECYCLE_WINDOWS = (
    "Add-Type -AssemblyName Microsoft.VisualBasic; "
    "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("
    "$env:FM_RECYCLE_PATH, 'OnlyErrorDialogs', 'SendToRecycleBin')"
)


_RECYCLE_FOLDER_WINDOWS = (
    "Add-Type -AssemblyName Microsoft.VisualBasic; "
    "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory("
    "$env:FM_RECYCLE_PATH, 'OnlyErrorDialogs', 'SendToRecycleBin')"
)


def _powershell(script: str, **env: str) -> subprocess.CompletedProcess[str]:
    # Paths travel in environment variables, never inside the script text.
    return subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-STA", "-Command", script],
        capture_output=True,
        text=True,
        timeout=600,
        check=False,
        env={**os.environ, **env},
    )


def choose_folder(current: Path) -> Path | None:
    """Native folder picker (Finder on a Mac, Explorer on Windows); None when cancelled."""
    if platform.system() == "Windows":
        try:
            result = _powershell(_PICK_WINDOWS, FM_CURRENT_FOLDER=str(current))
        except (OSError, subprocess.TimeoutExpired):
            return None
        chosen = result.stdout.strip()
        return Path(chosen) if result.returncode == 0 and chosen else None
    script = (
        'POSIX path of (choose folder with prompt "Choose where Football Memories saves downloads"'
        f' default location POSIX file "{current}")'
    )
    try:
        result = subprocess.run(
            ["osascript", "-e", script], capture_output=True, text=True, timeout=600, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    chosen = result.stdout.strip()
    return Path(chosen) if result.returncode == 0 and chosen else None


class DownloadFolder:
    def __init__(self, default: Path, settings: Path) -> None:
        self.default = default
        self.settings = settings
        self.trash = Path.home() / ".Trash"
        self.folder = default
        try:
            saved = Path(json.loads(settings.read_text())["download_folder"])
            if self._usable(saved):
                self.folder = saved.resolve()
        except (OSError, ValueError, KeyError, TypeError):
            pass

    @staticmethod
    def _usable(path: Path) -> bool:
        return path.is_absolute() and path.is_dir() and os.access(path, os.W_OK | os.X_OK)

    def set(self, path: Path | None) -> None:
        target = (path or self.default).expanduser()
        if not self._usable(target):
            raise CaptureError("Choose an existing folder this Mac can write to.")
        target = target.resolve()
        self.settings.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.settings.parent, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w") as stream:
                json.dump({"download_folder": str(target)} if path else {}, stream)
            os.replace(temporary, self.settings)
        finally:
            Path(temporary).unlink(missing_ok=True)
        self.folder = target

    def describe(self) -> dict[str, Any]:
        files: list[dict[str, Any]] = []
        try:
            entries = list(self.folder.iterdir())
        except OSError:
            entries = []
        for entry in entries:
            if entry.name.startswith(".") or entry.suffix.lower() not in _SHOWN:
                continue
            if entry.is_symlink() or not entry.is_file():
                continue
            stat = entry.stat()
            files.append({"name": entry.name, "size": stat.st_size, "modified": stat.st_mtime})
        files.sort(key=lambda f: (-float(f["modified"]), str(f["name"])))
        try:
            free = shutil.disk_usage(self.folder).free
        except OSError:
            free = None
        return {
            "folder": str(self.folder),
            "default_folder": str(self.default),
            "is_default": self.folder == self.default,
            "free_bytes": free,
            "files": files,
        }

    def trash_file(self, name: str) -> str:
        if not _NAME.fullmatch(name) or name.startswith(".") or name in {"..", "."}:
            raise CaptureError("Choose a file shown in the download folder.")
        path = self.folder / name
        if path.parent != self.folder or path.is_symlink() or not path.is_file():
            raise CaptureError("That file is not in the download folder.")
        if path.suffix.lower() not in _SHOWN:
            raise CaptureError("Choose a file shown in the download folder.")
        return self._trash(path)

    def trash_download(self, relative: str, listed: list[str]) -> str:
        """Owner request 2026-11-12: Downloaded > Delete. Only a file the Downloaded
        screen lists (``listed``, from the download index) may be moved to the Trash."""
        if relative not in listed:
            raise CaptureError("Choose a download shown on the Downloaded screen.")
        parts = relative.split("/")
        if len(parts) > 2 or any(p in {"", ".", ".."} or p.startswith(".") for p in parts):
            raise CaptureError("Choose a download shown on the Downloaded screen.")
        path = self.folder.joinpath(*parts)
        if path.is_symlink() or path.parent.is_symlink() or not path.is_file():
            raise CaptureError("That download is no longer in the download folder.")
        try:
            path.resolve().relative_to(self.folder.resolve())
        except ValueError:
            raise CaptureError("That download is not in the download folder.") from None
        return self._trash(path)

    def trash_media_folder(self, folder: Path) -> str:
        """Spec 220: a download's folder in ``Media library/`` (named by its manifest)."""
        if (
            folder.parent != self.folder / "Media library"
            or folder.name.startswith(".")
            or folder.is_symlink()
            or not folder.is_dir()
        ):
            raise CaptureError("The media library folder for this download was not found.")
        return self._trash(folder)

    def _trash(self, path: Path) -> str:
        name = path.name
        if platform.system() == "Windows":
            # Owner decision 2026-11-11: the Recycle Bin is Windows' Trash; restorable.
            script = _RECYCLE_FOLDER_WINDOWS if path.is_dir() else _RECYCLE_WINDOWS
            try:
                result = _powershell(script, FM_RECYCLE_PATH=str(path))
            except (OSError, subprocess.TimeoutExpired):
                result = None
            if result is None or result.returncode != 0 or path.exists():
                raise CaptureError(
                    "Could not move the file to the Recycle Bin. Nothing was deleted; "
                    "remove it in File Explorer instead."
                )
            return name
        self.trash.mkdir(exist_ok=True)
        destination = self.trash / name
        number = 1
        while destination.exists() or destination.is_symlink():
            destination = self.trash / f"{path.stem} ({number}){path.suffix}"
            number += 1
        try:
            # A same-volume rename is atomic and keeps every byte; never copy-then-delete.
            os.rename(path, destination)
        except OSError as error:
            raise CaptureError(
                "Could not move the file to the Trash (it may be on another drive). "
                "Nothing was deleted; remove it in Finder instead."
            ) from error
        return destination.name
