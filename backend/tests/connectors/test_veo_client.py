"""Spec 250: the one module that talks to Veo. GET only, /api/app/ only, paced, no retries."""

from unittest.mock import MagicMock

import pytest

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._client import (
    VeoApi,
    confirm_signed_in,
    sign_in,
    signed_in_header,
    token_http,
)

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


# Owner report 2026-11-13: Save and Test answered "Veo signed this session out"
# (401 on the first read). The sign-in must wait for Veo's form, wait for the app
# to finish loading after the hand-back, and a 401 straight after sign-in must
# say the sign-in did not take rather than that Veo signed the session out.


def _names(page: MagicMock) -> list[str]:
    return [
        c[0]
        for c in page.mock_calls
        if c[0] in {"wait_for_selector", "fill", "click", "wait_for_url", "wait_for_load_state"}
    ]


def test_sign_in_waits_for_the_email_field_before_typing() -> None:
    page = MagicMock()
    page.locator.return_value.count.return_value = 0
    sign_in(page, Credentials("veo@example.test", SECRET))
    page.wait_for_selector.assert_any_call("#email", state="visible", timeout=30_000)
    names = _names(page)
    assert names.index("wait_for_selector") < names.index("fill")


def test_sign_in_stops_without_typing_when_the_form_never_appears() -> None:
    page = MagicMock()
    page.locator.return_value.count.return_value = 0
    page.wait_for_selector.side_effect = TimeoutError("no form")
    with pytest.raises(CaptureError, match="sign-in form") as error:
        sign_in(page, Credentials("veo@example.test", SECRET))
    page.fill.assert_not_called()
    page.click.assert_not_called()
    assert SECRET not in str(error.value)


def test_sign_in_waits_for_the_app_to_finish_loading_after_the_hand_back() -> None:
    page = MagicMock()
    page.locator.return_value.count.return_value = 0
    sign_in(page, Credentials("veo@example.test", SECRET))
    names = _names(page)
    assert "wait_for_load_state" in names
    assert names.index("wait_for_url") < len(names) - 1 - names[::-1].index("wait_for_load_state")
    page.wait_for_load_state.assert_any_call("networkidle", timeout=30_000)


def test_a_401_straight_after_sign_in_says_the_sign_in_did_not_take() -> None:
    http = FakeHttp({"https://app.veo.co/api/app/user/": (401, {}, {})})
    veo, _ = api(http)
    with pytest.raises(CaptureError) as error:
        confirm_signed_in(veo)
    assert "did not keep the sign-in" in str(error.value)
    assert "signed this session out" not in str(error.value)
    assert len(http.calls) == 1


def test_confirm_passes_when_veo_knows_the_user_and_keeps_other_refusals() -> None:
    http = FakeHttp({"https://app.veo.co/api/app/user/": (200, {}, {"id": "u"})})
    veo, _ = api(http)
    confirm_signed_in(veo)
    assert len(http.calls) == 1
    http = FakeHttp({"https://app.veo.co/api/app/user/": (429, {}, {})})
    veo, _ = api(http)
    with pytest.raises(CaptureError, match="slow down"):
        confirm_signed_in(veo)


# Owner-approved checks 2026-11-13: Veo's page reads /api/app/user/ with a token it
# keeps in localStorage, not a cookie, so the app's cookie-only reads got 401. The
# client copies the sign-in header from the page's own successful read, in memory.

TOKEN = "Bearer FAKE_VEO_TOKEN_9d3e"  # noqa: S105


class FakeResponse:
    def __init__(self, status: int, body: object = None) -> None:
        self.status = status
        self.headers = {"x-veo-total-count": "3"}
        self._body = body

    def json(self) -> object:
        return self._body


class FakeRequest:
    def __init__(self, url: str, status: int | None, headers: dict[str, str]) -> None:
        self.url = url
        self._status = status
        self._headers = headers

    def response(self) -> FakeResponse | None:
        return None if self._status is None else FakeResponse(self._status)

    def all_headers(self) -> dict[str, str]:
        return self._headers


class FakeRequestContext:
    def __init__(self, status: int = 200) -> None:
        self.status = status
        self.sent: list[tuple[str, dict[str, str]]] = []

    def get(self, url: str, headers: dict[str, str]) -> FakeResponse:
        self.sent.append((url, headers))
        return FakeResponse(self.status, {"id": "u"})


USER = "https://app.veo.co/api/app/user/"


def test_takes_the_sign_in_header_from_the_pages_own_successful_user_read() -> None:
    seen = [
        FakeRequest(USER, 401, {"accept": "application/json"}),
        FakeRequest("https://app.veo.co/api/app/clubs/", 200, {"authorization": "other"}),
        FakeRequest(USER, 200, {"accept": "application/json", "authorization": TOKEN}),
    ]
    assert signed_in_header(seen) == TOKEN


def test_stops_clearly_when_the_page_never_sent_a_sign_in_header() -> None:
    for seen in (
        [],
        [FakeRequest(USER, 401, {"authorization": TOKEN})],
        [FakeRequest(USER, None, {"authorization": TOKEN})],
        [FakeRequest(USER, 200, {"accept": "application/json"})],
    ):
        with pytest.raises(CaptureError, match="sign-in has changed") as error:
            signed_in_header(seen)
        assert "FAKE_VEO_TOKEN" not in str(error.value)


def test_reads_send_the_header_and_a_refusal_never_carries_it(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level("DEBUG")
    request = FakeRequestContext()
    http = token_http(request, TOKEN)
    status, headers, body = http(USER)
    assert (status, body) == (200, {"id": "u"})
    assert headers == {"x-veo-total-count": "3"}
    assert request.sent == [(USER, {"Accept": "application/json", "Authorization": TOKEN})]
    refused = VeoApi(token_http(FakeRequestContext(401), TOKEN), sleep=lambda s: None)
    with pytest.raises(CaptureError) as error:
        refused.get("/api/app/user/")
    assert "FAKE_VEO_TOKEN" not in str(error.value) + repr(error.value) + caplog.text
    assert "FAKE_VEO_TOKEN" in TOKEN  # negative control: the marker is really in the token
