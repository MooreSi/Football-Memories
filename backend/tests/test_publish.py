"""Owner report 2026-11-12: saving to an SMB share on a NAS failed with OSError
(ENOTSUP): macOS SMB mounts have no hard links. Publishing falls back to claiming the
name exclusively and moving the finished file onto it, so an existing file is still
never replaced. tmp folders only; the link-less drive is simulated."""

import errno
import os

import pytest

from app.services import publish as publish_module
from app.services.publish import publish_new


def no_links(*args, **kwargs):
    raise OSError(errno.ENOTSUP, "Operation not supported")


def test_hard_link_is_used_when_the_drive_supports_it(tmp_path):
    source, target = tmp_path / "s.mp4", tmp_path / "t.mp4"
    source.write_bytes(b"video")
    publish_new(source, target)
    assert target.read_bytes() == b"video"
    assert source.exists() and source.stat().st_ino == target.stat().st_ino


def test_a_drive_without_hard_links_still_publishes(tmp_path, monkeypatch):
    source, target = tmp_path / "s.mp4", tmp_path / "t.mp4"
    source.write_bytes(b"video")
    monkeypatch.setattr(publish_module.os, "link", no_links)
    publish_new(source, target)
    assert target.read_bytes() == b"video"
    assert not source.exists()  # moved, not copied


@pytest.mark.parametrize("links", [True, False])
def test_an_existing_file_is_never_replaced(tmp_path, monkeypatch, links):
    source, target = tmp_path / "s.mp4", tmp_path / "t.mp4"
    source.write_bytes(b"new")
    target.write_bytes(b"the only copy")
    if not links:
        monkeypatch.setattr(publish_module.os, "link", no_links)
    with pytest.raises(FileExistsError):
        publish_new(source, target)
    assert target.read_bytes() == b"the only copy"
    assert source.read_bytes() == b"new"


def test_a_failed_move_leaves_no_placeholder(tmp_path, monkeypatch):
    source, target = tmp_path / "s.mp4", tmp_path / "t.mp4"
    source.write_bytes(b"video")
    monkeypatch.setattr(publish_module.os, "link", no_links)

    def broken(*args, **kwargs):
        raise OSError(errno.EIO, "I/O error")

    monkeypatch.setattr(publish_module.os, "replace", broken)
    with pytest.raises(OSError):
        publish_new(source, target)
    assert not target.exists()
    assert source.read_bytes() == b"video"


def test_other_link_errors_are_not_hidden(tmp_path, monkeypatch):
    source, target = tmp_path / "s.mp4", tmp_path / "t.mp4"
    source.write_bytes(b"video")

    def full(*args, **kwargs):
        raise OSError(errno.ENOSPC, "No space left on device")

    monkeypatch.setattr(publish_module.os, "link", full)
    with pytest.raises(OSError) as error:
        publish_new(source, target)
    assert error.value.errno == errno.ENOSPC
    assert not target.exists()
    assert os.path.exists(source)
