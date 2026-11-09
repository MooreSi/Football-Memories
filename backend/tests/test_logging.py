"""Secrets never reach logs (golden rule 1)."""

import io
import logging

from app.logging_setup import RedactingFilter, configure_logging

FAKE = "hunter2-fake-secret"


def _capture(apply_filter: bool) -> str:
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    if apply_filter:
        handler.addFilter(RedactingFilter())
    log = logging.getLogger(f"probe.{apply_filter}")
    log.handlers = [handler]
    log.propagate = False
    log.warning("login password=%s cookie: %s token=%s", FAKE, FAKE, FAKE)
    log.warning("Authorization: Bearer %s", FAKE)
    return buf.getvalue()


def test_the_redacting_filter_removes_secret_values() -> None:
    out = _capture(apply_filter=True)
    assert FAKE not in out
    assert "password=[REDACTED]" in out


def test_without_the_filter_the_secret_would_have_been_logged() -> None:
    """Negative control: proves the assertion above can fail."""
    assert FAKE in _capture(apply_filter=False)


def test_configure_logging_installs_the_filter_on_the_root_handler() -> None:
    configure_logging("INFO")
    root = logging.getLogger()
    assert any(isinstance(f, RedactingFilter) for h in root.handlers for f in h.filters)
