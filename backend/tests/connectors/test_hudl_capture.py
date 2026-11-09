from pathlib import Path

import pytest

from app.connectors.hudl_capture import CaptureError, parse_manifest, parse_moments

VIDEO = "synthetic-video"
BASE = "https://video.hudl.com/synthetic/master.m3u8?token=FAKE_SECRET"


def payload(*, synced: bool = True, start: int = 1200, end: int = 4800) -> dict:
    return {
        "data": {
            "taggingSessions": {
                "items": [
                    {
                        "id": "synthetic-session",
                        "videoId": VIDEO,
                        "dataSource": {"feedType": "SportsCode"},
                        "taggingSessionMetadata": {"isSyncedToVideo": synced},
                        "moments": {
                            "items": [
                                {
                                    "id": "synthetic-moment",
                                    "momentId": "synthetic-stable-id",
                                    "startTimeMs": start,
                                    "endTimeMs": end,
                                    "tags": [{"key": "HUDL_CODE", "values": ["SAM EXAMPLE"]}],
                                }
                            ]
                        },
                    }
                ]
            }
        }
    }


def test_player_code_is_explicit_and_milliseconds_become_seconds() -> None:
    moments = parse_moments([payload()], VIDEO, {"SAM EXAMPLE"})
    assert len(moments) == 1
    assert moments[0].time_s == 1.2
    assert moments[0].duration_s == 3.6
    assert moments[0].players == ("SAM EXAMPLE",)
    assert moments[0].category == "Player involvement"
    assert moments[0].source_event_id == "synthetic-session:synthetic-stable-id"


def test_hudl_adapter_clips_preroll_to_the_start_of_the_visible_video() -> None:
    from app.connectors.hudl_capture import clip_tag_padding

    original = payload(start=-1200)
    clipped = clip_tag_padding([original], VIDEO, 8)
    moments = parse_moments(clipped, VIDEO, set())
    assert moments[0].time_s == 0
    assert moments[0].duration_s == 4.8
    assert (
        original["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]["startTimeMs"]
        == -1200
    )


def test_name_shaped_code_is_a_category_without_explicit_mapping() -> None:
    moments = parse_moments([payload()], VIDEO, set())
    assert moments[0].category == "SAM EXAMPLE"
    assert moments[0].players == ()


def test_repeated_observed_response_does_not_duplicate_moments() -> None:
    assert len(parse_moments([payload(), payload()], VIDEO, set())) == 1


def test_other_match_data_is_ignored() -> None:
    assert parse_moments([payload()], "another-video", set()) == []


@pytest.mark.parametrize("start,end", [(-1, 4000), (5000, 4000), (True, 4000)])
def test_invalid_time_range_is_refused(start: int, end: int) -> None:
    with pytest.raises(CaptureError, match="timing"):
        parse_moments([payload(start=start, end=end)], VIDEO, set())


def test_unsynced_session_is_refused() -> None:
    with pytest.raises(CaptureError, match="synced"):
        parse_moments([payload(synced=False)], VIDEO, set())


def test_graphql_error_is_not_silently_imported_as_empty_data() -> None:
    with pytest.raises(CaptureError, match="tag data"):
        parse_moments([{"errors": [{"message": "token=FAKE_SECRET"}]}], VIDEO, set())


def test_master_selects_highest_rendition_within_explicit_height_limit() -> None:
    master = (
        "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=9000,RESOLUTION=1280x720\nhi.m3u8\n"
        "#EXT-X-STREAM-INF:BANDWIDTH=2000,RESOLUTION=960x540\nlow.m3u8\n"
    )
    parsed = parse_manifest(master, BASE, max_height=540)
    assert parsed.variant_url == "https://video.hudl.com/synthetic/low.m3u8"
    assert "FAKE_SECRET" not in repr(parsed)


def test_vod_manifest_localizes_init_and_segments_and_sums_duration() -> None:
    media = (
        '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4.0,\nseg1.m4s\n'
        "#EXTINF:3.5,\nseg2.m4s\n#EXT-X-ENDLIST\n"
    )
    parsed = parse_manifest(media, BASE, max_height=720)
    assert parsed.duration_s == 7.5
    assert parsed.resources == (
        "https://video.hudl.com/synthetic/init.mp4",
        "https://video.hudl.com/synthetic/seg1.m4s",
        "https://video.hudl.com/synthetic/seg2.m4s",
    )
    assert 'URI="asset-0.bin"' in parsed.local_playlist
    assert "asset-1.bin" in parsed.local_playlist
    assert "https:" not in parsed.local_playlist
    assert "FAKE_SECRET" not in repr(parsed)


@pytest.mark.parametrize(
    "reference",
    [
        "https://hudl.com.evil.test/seg.ts",
        "http://video.hudl.com/seg.ts",
        "file:///etc/passwd",
        "https://user:secret@video.hudl.com/seg.ts",
        "https://video.hudl.com:8443/seg.ts",
        "https://127.0.0.1/seg.ts",
    ],
)
def test_non_hudl_or_unsafe_media_reference_is_refused(reference: str) -> None:
    with pytest.raises(CaptureError, match="media address") as err:
        parse_manifest(f"#EXTM3U\n#EXTINF:4,\n{reference}\n#EXT-X-ENDLIST", BASE, max_height=720)
    assert "secret" not in str(err.value)


@pytest.mark.parametrize(
    "extra",
    [
        '#EXT-X-KEY:METHOD=AES-128,URI="key"\n',
        "#EXT-X-BYTERANGE:100@0\n",
        '#EXT-X-MEDIA:TYPE=AUDIO,URI="audio.m3u8"\n',
    ],
)
def test_unsupported_or_encrypted_media_is_refused(extra: str) -> None:
    with pytest.raises(CaptureError, match="unsupported|encrypted"):
        parse_manifest(f"#EXTM3U\n{extra}#EXTINF:4,\nseg.ts\n#EXT-X-ENDLIST", BASE, max_height=720)


def test_live_playlist_is_refused() -> None:
    with pytest.raises(CaptureError, match="complete"):
        parse_manifest("#EXTM3U\n#EXTINF:4,\nseg.ts", BASE, max_height=720)


def test_non_manifest_response_never_echoes_secrets() -> None:
    with pytest.raises(CaptureError) as err:
        parse_manifest("<html>token=FAKE_SECRET</html>", BASE, max_height=720)
    assert "FAKE_SECRET" not in str(err.value)


def test_capture_writes_verified_import_pair_without_touching_existing_files(
    tmp_path: Path, tiny_video: Path
) -> None:
    from app.connectors.hudl_capture import save_capture

    original = tmp_path / "keep.mp4"
    original.write_bytes(b"irreplaceable")
    result = save_capture(
        tiny_video, tmp_path, "match", parse_moments([payload()], VIDEO, set()), 4
    )
    assert result.name == "match.mp4"
    assert result.read_bytes() == tiny_video.read_bytes()
    assert result.with_suffix(".tags.csv").is_file()
    assert original.read_bytes() == b"irreplaceable"


def test_capture_never_overwrites_a_target_or_its_tags(tmp_path: Path, tiny_video: Path) -> None:
    from app.connectors.hudl_capture import save_capture

    original = tmp_path / "match.tags.csv"
    original.write_bytes(b"owner's existing tags")
    with pytest.raises(CaptureError, match="exists"):
        save_capture(tiny_video, tmp_path, "match", [], 4)
    assert original.read_bytes() == b"owner's existing tags"
    assert not (tmp_path / "match.mp4").exists()


def test_publication_verifies_the_copied_bytes(
    tmp_path: Path, tiny_video: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.connectors.hudl_capture import save_capture

    def corrupt_copy(source: Path, destination: Path) -> None:
        content = bytearray(source.read_bytes())
        content[-10] ^= 1
        destination.write_bytes(content)

    monkeypatch.setattr("app.connectors.hudl_capture.shutil.copyfile", corrupt_copy)
    with pytest.raises(CaptureError, match="checksum"):
        save_capture(tiny_video, tmp_path, "match", [], 4)
    assert not (tmp_path / "match.mp4").exists()
    assert not (tmp_path / "match.tags.csv").exists()


def test_incomplete_video_is_not_published(tmp_path: Path, tiny_video: Path) -> None:
    from app.connectors.hudl_capture import save_capture

    with pytest.raises(CaptureError, match="duration"):
        save_capture(tiny_video, tmp_path, "match", [], 100)
    assert not (tmp_path / "match.mp4").exists()
    assert not (tmp_path / "match.tags.csv").exists()


def test_padded_tag_end_is_clamped_to_actual_video_end(tmp_path: Path, tiny_video: Path) -> None:
    from app.connectors.hudl_capture import save_capture
    from app.services.sidecar import parse_sidecar

    saved = save_capture(
        tiny_video, tmp_path, "match", parse_moments([payload(end=7000)], VIDEO, set()), 4
    )
    rows = parse_sidecar(saved.with_suffix(".tags.csv"))
    assert rows[0].time_s == 1.2
    assert rows[0].duration_s == 2.8


def test_observed_hls_is_downloaded_serially_and_remuxed_locally(
    tmp_path: Path, tiny_video: Path
) -> None:
    import subprocess

    from app.connectors.hudl_capture import capture_hls
    from app.services.media import probe

    source = tmp_path / "source"
    source.mkdir()
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(tiny_video),
            "-c",
            "copy",
            "-f",
            "hls",
            "-hls_time",
            "1",
            "-hls_playlist_type",
            "vod",
            str(source / "media.m3u8"),
        ],
        check=True,
    )
    responses = {
        f"https://video.hudl.com/synthetic/{p.name}": p.read_bytes() for p in source.iterdir()
    }
    calls: list[str] = []

    def fetch(url: str) -> bytes:
        calls.append(url)
        return responses[url]

    scratch = tmp_path / "scratch"
    scratch.mkdir()
    path, duration = capture_hls(
        fetch, "https://video.hudl.com/synthetic/media.m3u8", scratch, max_height=720
    )
    assert abs(probe(path).duration_s - duration) < 1
    assert len(calls) == 1 + len(list(source.glob("*.ts")))
    assert all("https:" not in p.read_text() for p in scratch.glob("*.m3u8"))


def test_hls_transport_failure_never_echoes_remote_secrets(tmp_path: Path) -> None:
    from app.connectors.hudl_capture import capture_hls

    def fail(url: str) -> bytes:
        raise RuntimeError(url)

    with pytest.raises(CaptureError) as err:
        capture_hls(fail, BASE, tmp_path, max_height=720)
    assert "FAKE_SECRET" not in str(err.value)
    assert not (tmp_path / "capture.mp4").exists()
