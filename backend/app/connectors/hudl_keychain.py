"""OS secret stores only: no credential files, environment variables or secret argv.

macOS uses the Keychain. Windows (owner decision 2026-11-11) uses Credential
Manager, which encrypts the entry to the signed-in Windows user (DPAPI).
"""

from __future__ import annotations

import hashlib
import json
import platform
import subprocess
from pathlib import Path
from typing import Any

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError

SERVICES = ("Hudl", "Veo")


class Keychain:
    """One Keychain item per service (spec 250): FootballMemories.Hudl / .Veo."""

    label = "macOS Keychain"

    def __init__(self, directory: Path, service: str = "Hudl") -> None:
        if service not in SERVICES:
            raise ValueError("unknown service")
        self.directory = directory
        self.service = service

    def _executable(self) -> Path:
        if platform.system() != "Darwin":
            raise CaptureError(
                f"Saved {self.service} credentials require macOS Keychain on the desktop."
            )
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
                [
                    str(self._executable()),
                    *([] if self.service == "Hudl" else [self.service]),
                    operation,
                ],
                input=data,
                capture_output=True,
                timeout=180,
                check=False,
            )
            if result.returncode != 0:
                raise CaptureError(
                    f"Keychain access failed or no {self.service} credentials are saved."
                )
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
            raise CaptureError(
                f"Keychain could not read the saved {self.service} account."
            ) from None

    def configured(self) -> bool:
        try:
            self._invoke("exists")
            return True
        except CaptureError:
            return False


class _Advapi32:
    """Windows Credential Manager through advapi32 (ctypes, no extra package)."""

    CRED_TYPE_GENERIC = 1
    CRED_PERSIST_LOCAL_MACHINE = 2

    def __init__(self) -> None:
        import ctypes
        from ctypes import wintypes

        class FILETIME(ctypes.Structure):
            _fields_ = [("low", wintypes.DWORD), ("high", wintypes.DWORD)]

        class CREDENTIAL(ctypes.Structure):
            _fields_ = [
                ("Flags", wintypes.DWORD),
                ("Type", wintypes.DWORD),
                ("TargetName", wintypes.LPWSTR),
                ("Comment", wintypes.LPWSTR),
                ("LastWritten", FILETIME),
                ("CredentialBlobSize", wintypes.DWORD),
                ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)),
                ("Persist", wintypes.DWORD),
                ("AttributeCount", wintypes.DWORD),
                ("Attributes", ctypes.c_void_p),
                ("TargetAlias", wintypes.LPWSTR),
                ("UserName", wintypes.LPWSTR),
            ]

        self.ctypes = ctypes
        self.CREDENTIAL = CREDENTIAL
        self.api = ctypes.WinDLL("advapi32", use_last_error=True)  # type: ignore[attr-defined]
        self.api.CredWriteW.argtypes = [ctypes.POINTER(CREDENTIAL), wintypes.DWORD]
        self.api.CredWriteW.restype = wintypes.BOOL
        self.api.CredReadW.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.POINTER(CREDENTIAL)),
        ]
        self.api.CredReadW.restype = wintypes.BOOL
        self.api.CredFree.argtypes = [ctypes.c_void_p]

    def write(self, target: str, user: str, blob: bytes) -> None:
        ctypes = self.ctypes
        buffer = (ctypes.c_ubyte * len(blob)).from_buffer_copy(blob)
        credential = self.CREDENTIAL()
        credential.Type = self.CRED_TYPE_GENERIC
        credential.TargetName = target
        credential.UserName = user
        credential.CredentialBlobSize = len(blob)
        credential.CredentialBlob = ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte))
        credential.Persist = self.CRED_PERSIST_LOCAL_MACHINE
        if not self.api.CredWriteW(ctypes.byref(credential), 0):
            raise OSError(ctypes.get_last_error(), "CredWriteW failed")

    def read(self, target: str) -> tuple[str, bytes] | None:
        ctypes = self.ctypes
        pointer = ctypes.POINTER(self.CREDENTIAL)()
        if not self.api.CredReadW(target, self.CRED_TYPE_GENERIC, 0, ctypes.byref(pointer)):
            if ctypes.get_last_error() == 1168:  # ERROR_NOT_FOUND
                return None
            raise OSError(ctypes.get_last_error(), "CredReadW failed")
        try:
            entry = pointer.contents
            blob = ctypes.string_at(entry.CredentialBlob, entry.CredentialBlobSize)
            return str(entry.UserName or ""), bytes(blob)
        finally:
            self.api.CredFree(pointer)


class WindowsCredentialStore:
    """Same interface as Keychain; one generic credential, password only in its blob."""

    label = "Windows Credential Manager"
    TARGET = "FootballMemories/Hudl"
    MAX_BLOB = 2560  # CRED_MAX_CREDENTIAL_BLOB_SIZE

    def __init__(self, api: Any, service: str = "Hudl") -> None:
        if service not in SERVICES:
            raise ValueError("unknown service")
        self.api = api
        self.service = service
        self.target = f"FootballMemories/{service}"

    def __repr__(self) -> str:
        return "WindowsCredentialStore()"

    def save(self, credentials: Credentials) -> None:
        blob = json.dumps(
            {"username": credentials.username, "password": credentials.password.get_secret_value()}
        ).encode("utf-8")
        if len(blob) > self.MAX_BLOB:
            raise CaptureError("That username and password are too long for Credential Manager.")
        try:
            self.api.write(self.target, credentials.username, blob)
        except Exception:
            raise CaptureError(
                f"Windows Credential Manager could not save the {self.service} account."
            ) from None

    def load(self) -> Credentials:
        try:
            found = self.api.read(self.target)
            if found is None:
                raise LookupError
            data = json.loads(found[1].decode("utf-8"))
            return Credentials(data["username"], data["password"])
        except Exception:
            raise CaptureError(
                f"No {self.service} account is saved in Windows Credential Manager, or it could "
                "not be read."
            ) from None

    def configured(self) -> bool:
        try:
            return self.api.read(self.target) is not None
        except Exception:
            return False


def secret_store(directory: Path, service: str = "Hudl") -> Keychain | WindowsCredentialStore:
    """The operating system's own secret store for one service's saved account."""
    if platform.system() == "Windows":
        return WindowsCredentialStore(_Advapi32(), service=service)
    return Keychain(directory, service=service)
