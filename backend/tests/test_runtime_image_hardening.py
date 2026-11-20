"""Known vulnerable build tools and stale base images do not belong in runtime images."""

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("name", ["Dockerfile", "Dockerfile.capture"])
def test_python_runtime_is_pinned_patched_and_removes_pip_after_install(name: str) -> None:
    text = (ROOT / "backend" / name).read_text()
    assert "FROM python:3.12-slim@sha256:" in text
    assert "apt-get upgrade -y" in text
    assert "python -m pip uninstall -y pip" in text
    assert text.index("python -m pip uninstall -y pip") > text.index("pip install --no-cache-dir")


def test_web_runtime_uses_a_pinned_supported_nginx() -> None:
    text = (ROOT / "frontend" / "Dockerfile").read_text()
    assert "FROM nginx:stable-alpine@sha256:" in text
    assert "FROM nginx:1.27" not in text
