"""Measured clip encoding progress; subprocess diagnostics never leave this module."""

from __future__ import annotations

import subprocess
import threading
from collections.abc import Callable


def encode(arguments: list[str], duration: float, report: Callable[[float], None]) -> bool:
    try:
        with subprocess.Popen(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-n",
                "-nostats",
                "-progress",
                "pipe:1",
                *arguments,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        ) as process:
            timeout = threading.Timer(1800, process.kill)
            timeout.daemon = True
            timeout.start()
            done = 0.0
            try:
                report(done)
                assert process.stdout is not None
                for line in process.stdout:
                    key, _, value = line.strip().partition("=")
                    if key != "out_time_us":
                        continue
                    try:
                        seconds = int(value) / 1_000_000
                    except ValueError:
                        continue
                    done = min(duration, max(done, seconds))
                    report(done)
                return process.wait() == 0
            finally:
                timeout.cancel()
                if process.poll() is None:
                    process.kill()
                process.wait()
    except OSError:
        return False
