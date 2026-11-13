"""Spec 250: the one module that talks to Veo. GET only, /api/app/ only, paced, no retries."""

from unittest.mock import MagicMock

import pytest

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._client import VeoApi, sign_in

SECRET = "FAKE_VEO_SECRET_51c2"  # noqa: S105


class FakeHttp:
    def __init__(self, responses: dict[str, tuple[int, dict[str, str], object]]) -> None:
        self.responses = responses
        self.calls: list[str] = []

    def __call__(self, url: str) -> tuple[int, dict[str, str], object]:
        self.calls.append(url)
        return self.responses.get(url, (404, {}, {"detail": "not found"}))


def api(http: FakeHttp, clock: list[float] | None = None) -> tuple[VeoApi, list[float]]:
    waits: list[float] = []
    now = clock or [100.0]
    return VeoApi(
        http,
        sleep=lambda s: (waits.append(s), now.__setitem__(0, now[0] + s)),
        clock=lambda: now[0],
    ), waits


def test_reads_json_from_the_app_api_and_spaces_requests_a_second_apart() -> None:
    http = FakeHttp(
        {
            "https://app.veo.co/api/app/user/": (200, {}, {"id": "u"}),
            "https://app.veo.co/api/app/clubs/?filter=own": (200, {}, [{"slug": "riverside"}]),
        }
    )
    veo, waits = api(http)
    assert veo.get("/api/app/user/")[1] == {"id": "u"}
    assert veo.get("/api/app/clubs/?filter=own")[1] == [{"slug": "riverside"}]
    assert waits == [1.0]


def test_refuses_anything_outside_the_app_api_before_any_request() -> None:
    http = FakeHttp({})
    veo, _ = api(http)
    for path in (
        "/api/mes/v2/x/match-events",
        "https://evil.test/api/app/user/",
        "/api/app/../admin",
        "/matches/x/",
    ):
        with pytest.raises(CaptureError):
            veo.get(path)
    assert http.calls == []
    assert not hasattr(veo, "post") and not hasattr(veo, "put") and not hasattr(veo, "delete")


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_stops_on_refusal_without_retrying(status: int) -> None:
    http = FakeHttp({"https://app.veo.co/api/app/user/": (status, {}, {})})
    veo, _ = api(http)
    with pytest.raises(CaptureError) as error:
        veo.get("/api/app/user/")
    assert len(http.calls) == 1
    assert "Veo" in str(error.value)


def test_sign_in_stops_at_a_challenge_without_typing_anything() -> None:
    page = MagicMock()
    page.locator.return_value.count.return_value = 1
    page.locator.return_value.first.is_visible.return_value = True
    with pytest.raises(CaptureError, match="verification"):
        sign_in(page, Credentials("veo@example.test", SECRET))
    page.fill.assert_not_called()
    for call in page.locator.return_value.first.fill.call_args_list:
        assert SECRET not in repr(call)


def test_sign_in_fills_the_two_fields_and_waits_for_the_app() -> None:
    page = MagicMock()
    page.locator.return_value.count.return_value = 0
    sign_in(page, Credentials("veo@example.test", SECRET))
    page.fill.assert_any_call("#email", "veo@example.test")
    page.fill.assert_any_call("#password", SECRET)
    page.click.assert_called_once_with('button[type="submit"]')
    page.wait_for_url.assert_called_once()
