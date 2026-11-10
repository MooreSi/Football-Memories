"""macOS Keychain only: no credential files, environment variables or secret argv."""

from __future__ import annotations

import hashlib
import json
import platform
import subprocess
from pathlib import Path

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError


class Keychain:
    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def _executable(self) -> Path:
        if platform.system() != "Darwin":
            raise CaptureError("Saved Hudl credentials require macOS Keychain on the desktop.")
        source = Path(__file__).with_suffix(".swift")
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
        target = self.directory / f"keychain-{digest}"
        if not target.exists():
            self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            result = subprocess.run(
                ["/usr/bin/swiftc", "-O", str(source), "-o", str(target)],
                capture_output=True,
                timeout=180,
                check=False,
            )
            if result.returncode:
                raise CaptureError(
                    "Keychain helper could not start. Install Apple's command line tools."
                )
            target.chmod(0o700)
        return target

    def _invoke(self, operation: str, data: bytes = b"") -> bytes:
        try:
            result = subprocess.run(
                [str(self._executable()), operation],
                input=data,
                capture_output=True,
                timeout=180,
                check=False,
            )
            if result.returncode != 0:
                raise CaptureError("Keychain access failed or no Hudl credentials are saved.")
            return result.stdout
        except CaptureError:
            raise
        except Exception:
            raise CaptureError(
                "Keychain access failed. Check this Mac's Keychain permissions."
            ) from None

    def save(self, credentials: Credentials) -> None:
        self._invoke(
            "save",
            json.dumps(
                {
                    "username": credentials.username,
                    "password": credentials.password.get_secret_value(),
                }
            ).encode(),
        )

    def load(self) -> Credentials:
        try:
            data = json.loads(self._invoke("load"))
            return Credentials(data["username"], data["password"])
        except CaptureError:
            raise
        except Exception:
            raise CaptureError("Keychain could not read the saved Hudl account.") from None

    def configured(self) -> bool:
        try:
            self._invoke("exists")
            return True
        except CaptureError:
            return False
