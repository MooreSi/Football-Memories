"""Owner request 2026-11-14: the address phones and tablets on the home network use
to open the app. Read on this computer only (the helper is not in Docker); nothing is
sent anywhere. The routing probe opens a UDP socket without sending a packet."""

from __future__ import annotations

import ipaddress
import socket
import subprocess
import sys
from collections.abc import Callable
from typing import Any

Run = Callable[..., Any]


def _private(text: object) -> str | None:
    try:
        address = ipaddress.ip_address(str(text).strip())
    except ValueError:
        return None
    if (
        address.version != 4
        or not address.is_private
        or address.is_loopback
        or address.is_link_local
    ):
        return None
    return str(address)


def _route_probe() -> str | None:
    """The local address the computer would use to reach another network. UDP
    connect sets the route only; no packet leaves the computer."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        probe.connect(("10.254.254.254", 1))
        return str(probe.getsockname()[0])


def _ask(run: Run, args: list[str]) -> str | None:
    try:
        done = run(args, capture_output=True, text=True, timeout=3, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    return str(done.stdout).strip() or None if done.returncode == 0 else None


def lan_address(
    platform: str = sys.platform,
    run: Run = subprocess.run,
    probe: Callable[[], str | None] = _route_probe,
) -> dict[str, str | None]:
    host, ip = None, None
    if platform == "darwin":
        name = _ask(run, ["scutil", "--get", "LocalHostName"])
        host = f"{name}.local" if name and name.replace("-", "").isalnum() else None
        for interface in ("en0", "en1"):
            ip = _private(_ask(run, ["ipconfig", "getifaddr", interface]))
            if ip:
                break
    if ip is None:
        try:
            ip = _private(probe())
        except OSError:
            ip = None
    return {"host": host, "ip": ip}
