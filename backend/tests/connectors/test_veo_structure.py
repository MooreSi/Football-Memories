"""Spec 250: one module talks to Veo. Only veo/_client.py may import Playwright or an
HTTP client among the Veo modules."""

import re
from pathlib import Path

VEO = Path(__file__).resolve().parents[2] / "app" / "connectors" / "veo"


def test_only_the_client_imports_a_browser_or_http_library() -> None:
    pattern = re.compile(
        r"^\s*(from|import)\s+(playwright|httpx|requests|urllib\.request|aiohttp)", re.M
    )
    found = {p.name for p in VEO.glob("*.py") if pattern.search(p.read_text())}
    assert found == {"_client.py"}
    assert pattern.search("from playwright.sync_api import sync_playwright")  # negative control
