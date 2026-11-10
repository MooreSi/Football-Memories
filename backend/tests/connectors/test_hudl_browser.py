from unittest.mock import create_autospec

import pytest
from playwright.sync_api import BrowserContext, Response

from app.connectors.hudl_browser import Observation, fetch_media, match_id
from app.connectors.hudl_capture import CaptureError


def test_match_page_id_is_accepted_without_carrying_login_state() -> None:
    assert (
        match_id("https://www.hudl.com/watch/video/synthetic-video/explore/sportscode")
        == "synthetic-video"
    )


@pytest.mark.parametrize(
    "url",
    [
        "https://identity.hudl.com/u/login/identifier?state=FAKE_SECRET",
        "https://www.hudl.com/watch/video/test?token=FAKE_SECRET",
        "https://hudl.com.evil.test/watch/video/test",
        "https://user:FAKE_SECRET@www.hudl.com/watch/video/test",
    ],
)
def test_unsafe_match_page_is_refused_without_echoing_secrets(url: str) -> None:
    with pytest.raises(CaptureError) as err:
        match_id(url)
    assert "FAKE_SECRET" not in str(err.value)


@pytest.mark.parametrize("status", [401, 403, 429])
def test_challenge_response_stops_observation_without_reading_body(status: int) -> None:
    response = create_autospec(Response, instance=True)
    response.url = "https://video.hudl.com/private/master.m3u8?token=FAKE_SECRET"
    response.status = status
    observation = Observation("synthetic-video")
    observation.response(response)
    assert observation.failure == (
        "Hudl requires sign-in, access verification or a rate-limit pause. Capture stopped."
    )
    response.body.assert_not_called()
    response.json.assert_not_called()
    assert observation.manifests == {}


def test_only_tag_data_is_retained_from_graphql_responses() -> None:
    response = create_autospec(Response, instance=True)
    response.url = "https://www.hudl.com/api/graphql/query"
    response.status = 200
    response.json.return_value = {"data": {"organizerPlaylist": {"id": "unrelated"}}}
    observation = Observation("synthetic-video")
    observation.response(response)
    assert observation.payloads == []


def test_cancelled_manifest_prefetch_does_not_abort_other_valid_playback_data() -> None:
    response = create_autospec(Response, instance=True)
    response.url = "https://video.hudl.com/master.m3u8?token=FAKE_SECRET"
    response.status = 200
    response.text.side_effect = RuntimeError("cancelled token=FAKE_SECRET")
    observation = Observation("synthetic-video")
    observation.response(response)
    assert observation.failure is None
    assert observation.manifests == {}


def test_null_unrelated_graphql_data_is_not_a_capture_failure() -> None:
    response = create_autospec(Response, instance=True)
    response.url = "https://www.hudl.com/api/graphql/query"
    response.status = 200
    response.json.return_value = {"data": None}
    observation = Observation("synthetic-video")
    observation.response(response)
    assert observation.failure is None
    assert observation.payloads == []


@pytest.mark.parametrize("status", [401, 403, 429, 500, 302])
def test_media_transfer_has_no_redirect_or_auth_retry(
    status: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.connectors.hudl_browser._capture.time.sleep", lambda delay: None)
    context = create_autospec(BrowserContext, instance=True)
    response = context.request.get.return_value
    response.status = status
    with pytest.raises(CaptureError) as err:
        fetch_media(context, "https://video.hudl.com/media?token=FAKE_SECRET")
    context.request.get.assert_called_once_with(
        "https://video.hudl.com/media?token=FAKE_SECRET", max_redirects=0, timeout=60_000
    )
    response.body.assert_not_called()
    response.dispose.assert_called_once()
    assert "FAKE_SECRET" not in str(err.value)


def test_truncated_segment_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.connectors.hudl_browser._capture.time.sleep", lambda delay: None)
    context = create_autospec(BrowserContext, instance=True)
    response = context.request.get.return_value
    response.status = 200
    response.headers = {"content-length": "12"}
    response.body.return_value = b"short"
    with pytest.raises(CaptureError, match="truncated"):
        fetch_media(context, "https://video.hudl.com/segment")
    response.dispose.assert_called_once()


def test_browser_transport_exception_does_not_expose_remote_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.connectors.hudl_browser._capture.time.sleep", lambda delay: None)
    context = create_autospec(BrowserContext, instance=True)
    context.request.get.side_effect = RuntimeError("token=FAKE_SECRET")
    with pytest.raises(CaptureError) as err:
        fetch_media(context, "https://video.hudl.com/segment?token=FAKE_SECRET")
    assert "FAKE_SECRET" not in str(err.value)
