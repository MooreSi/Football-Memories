"""Owner request 2026-11-15: cut Veo highlights without downloading the whole match.

ffmpeg reads the match through a private relay on 127.0.0.1 (random port, random
path, this job only). The relay answers each Range with one `media_range` read,
which goes to Veo's video host through `_client` (host check, no redirects, at most
8 MB a read). So ffmpeg fetches only the index and the parts its clips need, as a
Hudl moment fetches only its segments. The video address never reaches ffmpeg, a
message or a log.
"""

from __future__ import annotations

import re
import secrets
import socket
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

Fetch = Callable[[int, int | None], tuple[int, int, bytes]]


class RelayState:
    def __init__(self) -> None:
        self.failure: Exception | None = None
        self.bytes = 0


@contextmanager
def range_relay(fetch: Fetch) -> Iterator[tuple[str, RelayState]]:
    """A local address ffmpeg can read the match from, for the length of the block."""
    path = f"/{secrets.token_urlsafe(18)}.mp4"
    state = RelayState()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 (http.server's name)
            if self.path != path or state.failure is not None:
                self.send_error(404)
                return
            found = re.fullmatch(r"bytes=(\d+)-(\d*)", (self.headers.get("Range") or "bytes=0-"))
            if not found:
                self.send_error(416)
                return
            # One answer for the whole range asked, filled read by read (each at most
            # 8 MB through `_client`) while ffmpeg keeps reading. A capped answer made
            # ffmpeg stop early (real-match check 2026-11-15: 13.6 s of a 15 s clip).
            first = int(found[1])
            try:
                start, total, body = fetch(first, int(found[2]) if found[2] else None)
            except Exception as error:  # noqa: BLE001 (kept for the job; ffmpeg then stops)
                state.failure = error
                self.send_error(502)
                return
            last = min(int(found[2]), total - 1) if found[2] else total - 1
            state.bytes += len(body)
            self.send_response(206)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{last}/{total}")
            self.send_header("Content-Length", str(last - start + 1))
            self.end_headers()
            # A small send buffer, so the relay reads ahead of ffmpeg by little more
            # than one read (local sockets otherwise buffer several MB).
            self.connection.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 131_072)
            at = start
            try:
                while True:
                    self.wfile.write(body)
                    at += len(body)
                    if at > last or not body or state.failure is not None:
                        return
                    try:
                        _, _, body = fetch(at, last)
                    except Exception as error:  # noqa: BLE001
                        state.failure = error
                        return
                    state.bytes += len(body)
            except OSError:  # ffmpeg closes once it has what it needs
                return

        def log_message(self, *args: object) -> None:  # never log requests or paths
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}{path}", state
    finally:
        server.shutdown()
        server.server_close()
