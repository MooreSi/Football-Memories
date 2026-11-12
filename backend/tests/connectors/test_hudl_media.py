"""Spec 220: details for Plex and other media players. tmp folders only, no Hudl."""

import json
import os
import subprocess
import xml.etree.ElementTree as ET  # parses only XML these tests just generated
import zipfile
from pathlib import Path

from app.connectors.hudl_media import MediaLibrary

CONTEXT = {
    "club": "Aston Villa",
    "player": "Sam Example",
    "matches": {"m1": {"label": "Aston Villa vs. Cambridge United U11", "ours": 3, "theirs": 1}},
}


def tags(path: Path) -> dict[str, str]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return json.loads(out)["format"].get("tags", {})


def frames(path: Path) -> str:
    """A checksum of every video and audio frame, ignoring the container's tags."""
    return subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
            "-map",
            "0",
            "-c",
            "copy",
            "-f",
            "framemd5",
            "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def entry(kind: str, file: str, **extra):
    return {
        "kind": kind,
        "match_id": "m1",
        "matches": ["m1"],
        "title": "260712 U11 v Cambridge (A)",
        "file": file,
        "moment_count": 14,
        "codes": ["Goal", "Sam Example"],
        "combined": False,
        **extra,
    }


TITLES = {"m1": "260712 U11 v Cambridge (A)", "m2": "260825 U11 v Walsall (H)"}


# --- what the details say -------------------------------------------------------


def test_details_use_the_app_label_score_player_and_hudl_date(tmp_path):
    media = MediaLibrary(tmp_path)
    media.configure(context=CONTEXT)
    d = media.details(entry("match", "hudl-x.mp4"), TITLES)
    assert d.title == "Aston Villa vs. Cambridge United U11 - Full match"
    assert d.name == "2026-07-12 Aston Villa vs. Cambridge United U11 - Full match"
    assert d.played is not None and d.played.isoformat() == "2026-07-12"
    assert "Score: 3-1" in d.plot
    assert "Away" in d.plot and "2026/27" in d.plot and "U11" in d.plot
    assert "Sam Example" in d.plot
    assert {"U11", "2026/27", "Goal"} <= set(d.tags)


def test_details_fall_back_to_the_hudl_title_without_app_context(tmp_path):
    d = MediaLibrary(tmp_path).details(entry("moments", "moments/a.zip"), TITLES)
    assert d.title == "U11 v Cambridge (A) - Moments"
    assert "Score" not in d.plot  # no score is invented


def test_undated_titles_have_no_date(tmp_path):
    d = MediaLibrary(tmp_path).details(
        entry("match", "hudl-x.mp4", match_id="m9", matches=["m9"], title="Training"), {}
    )
    assert d.played is None
    assert d.name == "Training - Full match"
    assert not any(a.startswith("date=") for a in d.ffmpeg_args())


def test_multi_match_reel_lists_its_matches_and_takes_the_latest_date(tmp_path):
    media = MediaLibrary(tmp_path)
    reel = entry("reel", "reels/r.mp4", match_id=None, matches=["m1", "m2"], title="Sam highlights")
    d = media.details(reel, TITLES)
    assert d.title == "Sam highlights"
    assert d.played is not None and d.played.isoformat() == "2026-08-25"
    assert "Walsall" in d.plot and "Cambridge" in d.plot


def test_per_match_reel_is_named_after_its_match(tmp_path):
    media = MediaLibrary(tmp_path)
    media.configure(context=CONTEXT)
    reel = entry("reel", "reels/r.mp4", title="Sam highlights - 260712 U11 v Cambridge (A)")
    d = media.details(reel, TITLES)
    assert d.title == "Aston Villa vs. Cambridge United U11 - Sam highlights"


def test_ffmpeg_tags_land_in_the_file(tmp_path, tiny_video):
    media = MediaLibrary(tmp_path)
    media.configure(context=CONTEXT)
    d = media.details(entry("match", "hudl-x.mp4"), TITLES)
    out = tmp_path / "tagged.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-i",
            str(tiny_video),
            "-c",
            "copy",
            *d.ffmpeg_args(),
            str(out),
        ],
        check=True,
    )
    found = tags(out)
    assert found["title"] == d.title
    assert found["date"] == "2026-07-12"
    assert found["genre"] == "Football"
    assert found["artist"] == "Sam Example"
    assert "Score: 3-1" in found["synopsis"]
    assert "title" not in tags(tiny_video)  # negative control: the source had none


def test_nfo_is_valid_kodi_movie_xml_and_escapes_text(tmp_path):
    media = MediaLibrary(tmp_path)
    media.configure(context={**CONTEXT, "player": "Sam <&> Example"})
    root = ET.fromstring(media.details(entry("match", "hudl-x.mp4"), TITLES).nfo())  # noqa: S314
    assert root.tag == "movie"
    assert root.findtext("title") == "Aston Villa vs. Cambridge United U11 - Full match"
    assert root.findtext("premiered") == "2026-07-12"
    assert root.findtext("year") == "2026"
    assert root.findtext("actor/name") == "Sam <&> Example"
    assert "Football" in [g.text for g in root.findall("genre")]


def test_configure_rejects_nothing_silently_and_survives_restart(tmp_path):
    media = MediaLibrary(tmp_path)
    assert media.enabled is False  # off until the owner turns it on
    media.configure(enabled=True, context=CONTEXT)
    again = MediaLibrary(tmp_path)
    assert again.enabled is True
    assert again.context["player"] == "Sam Example"


# --- the media library folder ----------------------------------------------------


def _root(tmp_path: Path, tiny_video: Path):
    root = tmp_path / "inbox"
    (root / "moments").mkdir(parents=True)
    (root / "reels").mkdir()
    video = root / "hudl-x-highest-1080p-1.mp4"
    video.write_bytes(tiny_video.read_bytes())
    bundle = root / "moments" / "Cambridge moments.zip"
    with zipfile.ZipFile(bundle, "x") as z:
        z.write(tiny_video, "Cambridge - Goal - 001.mp4")
        z.write(tiny_video, "Cambridge - Save - 002.mp4")
        z.writestr("moments.json", "[]")
    poster = tmp_path / "poster.jpg"
    poster.write_bytes(b"\xff\xd8\xff\xe0 jpeg")
    entries = [
        entry("match", video.name),
        entry("moments", "moments/Cambridge moments.zip"),
    ]
    return root, entries, poster


def snapshot(root: Path) -> dict[str, tuple[bytes, int]]:
    return {
        str(p.relative_to(root)): (p.read_bytes(), p.stat().st_mtime_ns)
        for p in root.rglob("*")
        if p.is_file() and "Media library" not in p.parts
    }


def test_sync_builds_one_folder_per_download_without_touching_originals(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    before = snapshot(root)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True, context=CONTEXT)
    summary = media.sync(root, entries, TITLES, lambda match_id: poster)
    assert summary["failed"] == []
    library = root / "Media library"
    name = "2026-07-12 Aston Villa vs. Cambridge United U11 - Full match"
    linked = library / name / f"{name}.mp4"
    assert linked.stat().st_ino == (root / entries[0]["file"]).stat().st_ino  # a link, no copy
    assert (library / name / "poster.jpg").read_bytes() == poster.read_bytes()
    assert ET.parse(library / name / f"{name}.nfo").getroot().tag == "movie"  # noqa: S314
    clips = library / "2026-07-12 Aston Villa vs. Cambridge United U11 - Moments"
    assert sorted(p.name for p in clips.glob("*.mp4")) == [
        "Cambridge - Goal - 001.mp4",
        "Cambridge - Save - 002.mp4",
    ]
    assert (clips / "Cambridge - Goal - 001.nfo").is_file()
    assert not (clips / "moments.json").exists()
    assert snapshot(root) == before  # every download byte-identical, same mtime


def test_sync_is_idempotent_and_updates_only_its_own_nfo(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True, context=CONTEXT)
    first = media.sync(root, entries, TITLES, lambda match_id: poster)
    assert first["created"] > 0
    name = "2026-07-12 Aston Villa vs. Cambridge United U11 - Full match"
    nfo = root / "Media library" / name / f"{name}.nfo"
    again = media.sync(root, entries, TITLES, lambda match_id: poster)
    assert again["created"] == 0 and again["updated"] == 0
    media.configure(context={**CONTEXT, "matches": {"m1": {**CONTEXT["matches"]["m1"], "ours": 4}}})
    changed = media.sync(root, entries, TITLES, lambda match_id: poster)
    assert changed["updated"] >= 1
    assert "Score: 4-1" in nfo.read_text()
    assert (root / "Media library" / name).is_dir()  # folder name kept, not renamed


def test_sync_never_replaces_a_file_it_did_not_write(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    name = "2026-07-12 Aston Villa vs. Cambridge United U11 - Full match"
    theirs = root / "Media library" / name
    theirs.mkdir(parents=True)
    (theirs / "poster.jpg").write_bytes(b"owner's own poster")
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True, context=CONTEXT)
    media.sync(root, entries, TITLES, lambda match_id: poster)
    assert (theirs / "poster.jpg").read_bytes() == b"owner's own poster"
    assert list(theirs.iterdir()) == [theirs / "poster.jpg"]  # their folder left alone
    ours = root / "Media library" / f"{name} (2)"
    assert (ours / f"{name} (2).mp4").is_file()


def test_sync_reports_a_drive_that_cannot_link_and_copies_nothing(
    tmp_path, tiny_video, monkeypatch
):
    root, entries, poster = _root(tmp_path, tiny_video)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)

    def refuse(*args, **kwargs):
        raise OSError("Operation not supported")

    monkeypatch.setattr(os, "link", refuse)
    summary = media.sync(root, entries[:1], TITLES, lambda match_id: None)
    assert len(summary["failed"]) == 1
    assert not list((root / "Media library").rglob("*.mp4"))


def test_sync_skips_a_poster_that_is_not_a_jpeg(tmp_path, tiny_video):
    root, entries, _ = _root(tmp_path, tiny_video)
    webp = tmp_path / "poster.webp"
    webp.write_bytes(b"RIFF....WEBP")
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)
    media.sync(root, entries[:1], TITLES, lambda match_id: webp)
    assert not list((root / "Media library").rglob("poster.jpg"))


def test_folder_for_names_only_folders_this_app_made(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)
    media.sync(root, entries, TITLES, lambda match_id: poster)
    folder = media.folder_for(root, entries[0]["file"])
    assert folder is not None and folder.parent == root / "Media library"
    assert media.folder_for(root, "reels/other.mp4") is None
    media.forget(root, entries[0]["file"])
    assert media.folder_for(root, entries[0]["file"]) is None


def test_a_drive_without_hard_links_gets_a_copy_and_says_so(tmp_path, tiny_video, monkeypatch):
    """The owner's NAS share (SMB) refuses hard links with ENOTSUP. The media library
    then holds a copy, reports its size, and still never changes the original."""
    import errno

    root, entries, poster = _root(tmp_path, tiny_video)
    before = snapshot(root)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True, context=CONTEXT)

    def no_links(*args, **kwargs):
        raise OSError(errno.ENOTSUP, "Operation not supported")

    monkeypatch.setattr(os, "link", no_links)
    summary = media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    assert summary["failed"] == []
    name = "2026-07-12 Aston Villa vs. Cambridge United U11 - Full match"
    copy = root / "Media library" / name / f"{name}.mp4"
    original = root / entries[0]["file"]
    # Owner approved 2026-11-12: a copy carries the app's details inside it (Plex
    # reads only those), so it is compared by picture and sound, not bytes.
    assert frames(copy) == frames(original)
    assert tags(copy)["title"] == "Aston Villa vs. Cambridge United U11 - Full match"
    assert copy.stat().st_ino != original.stat().st_ino  # a real copy, not a link
    assert summary["copied"] == 1
    assert summary["copied_bytes"] == copy.stat().st_size
    assert (copy.with_suffix(".nfo")).is_file()
    assert not list((root / "Media library" / name).glob(".*.part"))  # no temp left behind
    assert snapshot(root) == before
    again = media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    assert again["copied"] == 0 and again["created"] == 0  # copied once only


def test_a_linked_library_reports_no_copies(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)
    summary = media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    assert summary["copied"] == 0 and summary["copied_bytes"] == 0


def test_tags_have_no_slash_because_plex_splits_on_it(tmp_path):
    """Plex made collections "U11 2026" and "27" from the album "U11 2026/27"."""
    media = MediaLibrary(tmp_path)
    media.configure(context=CONTEXT)
    args = media.details(entry("match", "hudl-x.mp4"), TITLES).ffmpeg_args()
    values = dict(a.split("=", 1) for a in args if "=" in a)
    assert values["album"] == "U11 2026-27"
    assert "/" not in values["keywords"] and "2026-27" in values["keywords"]


def _no_links(monkeypatch):
    import errno

    def refuse(*args, **kwargs):
        raise OSError(errno.ENOTSUP, "Operation not supported")

    monkeypatch.setattr(os, "link", refuse)


def test_a_copy_carries_the_apps_details_and_is_retagged_when_they_change(
    tmp_path, tiny_video, monkeypatch
):
    root, entries, poster = _root(tmp_path, tiny_video)
    before = snapshot(root)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)  # no app context yet: Hudl-style title
    _no_links(monkeypatch)
    media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    folder = media.folder_for(root, entries[0]["file"])
    assert folder is not None
    copy = folder / f"{folder.name}.mp4"
    assert tags(copy)["title"] == "U11 v Cambridge (A) - Full match"
    media.configure(context=CONTEXT)
    summary = media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    assert tags(copy)["title"] == "Aston Villa vs. Cambridge United U11 - Full match"
    assert summary["updated"] >= 1 and summary["copied"] == 0
    assert not list(folder.glob(".*"))  # no temp left behind
    assert snapshot(root) == before  # the original is never rewritten
    inode = copy.stat().st_ino
    media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    assert copy.stat().st_ino == inode  # unchanged details: not rewritten again


def test_a_linked_video_is_never_rewritten_for_new_details(tmp_path, tiny_video):
    root, entries, poster = _root(tmp_path, tiny_video)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)
    media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    media.configure(context=CONTEXT)
    media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    original = root / entries[0]["file"]
    folder = media.folder_for(root, entries[0]["file"])
    assert folder is not None
    assert (folder / f"{folder.name}.mp4").stat().st_ino == original.stat().st_ino
    assert "title" not in tags(original)


def test_copies_made_before_retagging_existed_are_recognised(tmp_path, tiny_video, monkeypatch):
    """The owner's 17 NAS copies were made by a version that did not mark them."""
    root, entries, poster = _root(tmp_path, tiny_video)
    before = snapshot(root)
    media = MediaLibrary(tmp_path / "cache")
    media.configure(enabled=True)
    _no_links(monkeypatch)
    media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    manifest_path = root / "Media library" / ".football-memories.json"
    manifest = json.loads(manifest_path.read_text())
    for record in manifest.values():
        record.pop("copy", None)
        record.pop("tagged", None)
    manifest_path.write_text(json.dumps(manifest))
    media.configure(context=CONTEXT)
    summary = media.sync(root, entries[:1], TITLES, lambda match_id: poster)
    folder = media.folder_for(root, entries[0]["file"])
    assert folder is not None
    assert tags(folder / f"{folder.name}.mp4")["title"].startswith("Aston Villa vs.")
    assert summary["updated"] >= 1
    assert snapshot(root) == before
