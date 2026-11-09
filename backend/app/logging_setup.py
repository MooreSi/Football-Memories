"""Structured logging with secret redaction (golden rule 1)."""

from __future__ import annotations

import json
import logging
import re

_SECRET = re.compile(
    r"(?i)\b(password|passwd|pwd|token|access_token|refresh_token|cookie|set-cookie|secret|"
    r"api[_-]?key|authorization|session)(\s*[:=]\s*)(bearer\s+)?([^\s,;&]+)"
)


def redact(text: str) -> str:
    return _SECRET.sub(lambda m: f"{m.group(1)}{m.group(2)}[REDACTED]", text)


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact(record.getMessage())
        record.args = None
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = redact(self.formatException(record.exc_info))
        return json.dumps(payload)


def configure_logging(level: str) -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    for h in list(root.handlers):
        if getattr(h, "_fm_handler", False):
            root.removeHandler(h)
    handler = logging.StreamHandler()
    handler._fm_handler = True  # type: ignore[attr-defined]
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RedactingFilter())
    root.addHandler(handler)
