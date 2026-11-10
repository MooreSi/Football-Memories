"""Scoped localhost desktop bridge; saved credentials live in macOS Keychain only."""

from __future__ import annotations

import argparse
import threading
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.connectors import hudl_downloads
from app.connectors.hudl_account import Catalogue, Credentials
from app.connectors.hudl_browser import BrowserConnection, match_id, run
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_downloads import DownloadFolder
from app.connectors.hudl_keychain import Keychain
from app.connectors.hudl_metadata import MatchCache, age_group, capture_key, season_label

ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
}


class CaptureRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    url: str = Field(max_length=500)
    max_height: Literal[360, 480, 540, 720, 1080, 2160, 65536] = 65536
    player_codes: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("url")
    @classmethod
    def valid_match(cls, value: str) -> str:
        match_id(value)
        return value


class AccountCredentials(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    username: str = Field(min_length=3, max_length=320, repr=False)
    password: SecretStr = Field(min_length=1, max_length=1000, repr=False)


class AccountAction(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    action: Literal["test", "refresh", "stream", "download", "disconnect", "clips", "sync_tags"]
    match_id: str | None = Field(default=None, max_length=300)
    moment_ids: list[str] = Field(default_factory=list, max_length=2000)
    combined: bool = False


class FolderAction(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    action: Literal["choose", "reset"]


class DeleteDownload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    name: str = Field(min_length=1, max_length=255)


class CaptureBusy(Exception):
    pass


class CaptureManager:
    def __init__(self, output: Path) -> None:
        self.output = output
        self._lock = threading.Lock()
        self._active = False
        self._status: dict[str, str | None] = {
            "state": "idle",
            "message": "Ready to capture a match.",
            "filename": None,
        }

    def status(self) -> dict[str, str | None]:
        with self._lock:
            return dict(self._status)

    def _report(self, state: str, message: str) -> None:
        with self._lock:
            self._status.update(state=state, message=message)

    def start(self, request: CaptureRequest) -> None:
        with self._lock:
            if self._active:
                raise CaptureBusy
            self._active = True
            self._status = {"state": "login", "message": "Opening Hudl sign-in…", "filename": None}
        threading.Thread(target=self._worker, args=(request,), daemon=True).start()

    def _worker(self, request: CaptureRequest) -> None:
        args = argparse.Namespace(
            url=request.url,
            output=str(self.output),
            name=None,
            max_height=request.max_height,
            player_code=request.player_codes,
            inspect_only=False,
        )
        try:
            result = run(args, self._report)
            with self._lock:
                self._status["filename"] = result.name if result else None
        except CaptureError as error:
            self._report("error", str(error))
        except Exception:
            self._report("error", "Capture stopped. Check the browser, disk space and ffmpeg.")
        finally:
            with self._lock:
                self._active = False


def create_companion(output: Path) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        yield
        application.state.account.close()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    output = output.expanduser().resolve()
    app.state.capture = CaptureManager(output)
    cache = output.parent / ".hudl-account"
    app.state.keychain = Keychain(Path.home() / "Library/Caches/FootballMemories")
    app.state.catalogue = Catalogue(cache)
    app.state.details = MatchCache(cache / "details")
    app.state.account = BrowserConnection(
        lambda: app.state.keychain.load(), app.state.catalogue, output
    )
    app.state.downloads = DownloadFolder(output, cache / "downloads.json")
    app.state.account.output = app.state.capture.output = app.state.downloads.folder
    app.state.account_configured = None
    app.state.hudl_gate = threading.Lock()
    import secrets

    app.state.file_scope = secrets.token_urlsafe(24)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(ORIGINS),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def restrict_browser_access(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        origin = request.headers.get("origin")
        if request.headers.get("host") not in {"127.0.0.1:8766", "localhost:8766"} or (
            origin not in ORIGINS
            and not (
                origin is None
                and request.method == "GET"
                and request.url.path.startswith(f"/files/{app.state.file_scope}/")
            )
        ):
            return JSONResponse(
                {"detail": "Only the local Football Memories app can use this helper."},
                status_code=403,
            )
        if request.method == "POST" and (
            request.headers.get("content-type") != "application/json"
            or int(request.headers.get("content-length", "0"))
            > (262144 if request.url.path == "/account/action" else 8192)
        ):
            return JSONResponse({"detail": "Invalid capture request."}, status_code=400)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        # Pydantic's default response includes the supplied input, which could
        # be a login URL or an accidentally submitted password.
        return JSONResponse(
            {"detail": "Invalid capture request. Use a Hudl match page address."}, status_code=400
        )

    @app.exception_handler(CaptureError)
    async def account_error(request: Request, error: CaptureError) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=400)

    @app.get("/account")
    def account_status(request: Request) -> dict[str, object]:
        if request.app.state.account_configured is None:
            request.app.state.account_configured = request.app.state.keychain.configured()
        return {
            **request.app.state.account.status(),
            "configured": request.app.state.account_configured,
            "download_url": (
                f"http://127.0.0.1:8766/files/{app.state.file_scope}/{request.app.state.account.status()['filename']}"
                if request.app.state.account.status().get("filename")
                else None
            ),
        }

    @app.get("/library")
    def remote_library(request: Request) -> list[dict[str, object]]:
        return [
            {
                **item,
                "age_group": (item.get("age_groups") or [age_group(item["title"])])[0],
                "season_label": season_label(item["title"]),
                "capture_key": capture_key(item["id"]),
                "thumbnail_url": f"http://127.0.0.1:8766/account/match/{item['id']}/thumbnail"
                if request.app.state.details.path(item["id"], ".image").is_file()
                else None,
                **request.app.state.details.read(item["id"]),
            }
            for item in request.app.state.catalogue.items()
        ]

    @app.get("/account/match/{identity}/thumbnail")
    def match_image(identity: str, request: Request) -> FileResponse:
        request.app.state.catalogue.find(identity)
        path = request.app.state.details.path(identity, ".image")
        if not path.is_file():
            raise CaptureError("Thumbnail is not cached yet. Refresh matches.")
        return FileResponse(path)

    def idle_for_files(request: Request) -> None:
        account = request.app.state.account.status()
        if (account["busy"] and not account.get("syncing")) or request.app.state.capture.status()[
            "state"
        ] not in {"idle", "done", "error"}:
            raise CaptureError("Wait for the active download or export to finish first.")

    @app.get("/downloads")
    def downloads(request: Request) -> dict[str, object]:
        return dict(request.app.state.downloads.describe())

    @app.post("/downloads/folder")
    def download_folder(body: FolderAction, request: Request) -> dict[str, object]:
        with request.app.state.hudl_gate:
            idle_for_files(request)
            folders: DownloadFolder = request.app.state.downloads
            if body.action == "reset":
                folders.set(None)
            else:
                chosen = hudl_downloads.choose_folder(folders.folder)
                if chosen is None:
                    raise CaptureError("No folder chosen. Downloads still go to the same place.")
                folders.set(chosen)
            request.app.state.account.output = folders.folder
            request.app.state.capture.output = folders.folder
            return dict(folders.describe())

    @app.post("/downloads/delete")
    def delete_download(body: DeleteDownload, request: Request) -> dict[str, object]:
        with request.app.state.hudl_gate:
            idle_for_files(request)
            moved = request.app.state.downloads.trash_file(body.name)
            return {**request.app.state.downloads.describe(), "trashed_as": moved}

    @app.get("/files/{scope}/{filename}")
    def captured_file(scope: str, filename: str, request: Request) -> FileResponse:
        import re

        if scope != app.state.file_scope:
            raise CaptureError("This download link has expired.")
        if not re.fullmatch(r"hudl-[a-zA-Z0-9-]+\.(mp4|zip|csv)", filename):
            raise CaptureError("Select a completed capture.")
        path = request.app.state.downloads.folder / filename
        if not path.is_file() or path.is_symlink():
            raise CaptureError("Capture is not available.")
        return FileResponse(path, filename=filename)

    @app.post("/account/credentials")
    def save_credentials(body: AccountCredentials, request: Request) -> dict[str, bool]:
        if request.app.state.account.status()["busy"]:
            raise CaptureError("Wait for the active Hudl operation before changing accounts.")
        request.app.state.keychain.save(
            Credentials(body.username, body.password.get_secret_value())
        )
        request.app.state.account_configured = True
        request.app.state.account.reset()
        return {"saved": True}

    @app.post("/account/action", status_code=202)
    def account_action(body: AccountAction, request: Request) -> dict[str, bool]:
        with request.app.state.hudl_gate:
            if request.app.state.capture.status()["state"] not in {"idle", "done", "error"}:
                raise CaptureError("A URL capture is already running. Wait for it to finish.")
            if body.action in {"stream", "download", "clips"}:
                if not body.match_id:
                    raise CaptureError("Select a cached match first.")
                request.app.state.catalogue.find(body.match_id)
            if body.action == "clips":
                request.app.state.account.start(
                    body.action, body.match_id, body.moment_ids, combined=body.combined
                )
            else:
                request.app.state.account.start(body.action, body.match_id)
        return {"accepted": True}

    @app.get("/stream/{stream}/{asset}")
    def stream_resource(stream: str, asset: str, request: Request) -> Response:
        content, media_type = request.app.state.account.resource(stream, asset)
        return Response(
            content=content, media_type=media_type, headers={"Cache-Control": "no-store"}
        )

    @app.get("/status")
    def status(request: Request) -> dict[str, str | None]:
        manager: CaptureManager = request.app.state.capture
        return manager.status()

    @app.post("/capture", status_code=202)
    def capture(body: CaptureRequest, request: Request) -> JSONResponse:
        manager: CaptureManager = request.app.state.capture
        with request.app.state.hudl_gate:
            account = request.app.state.account.status()
            if account["busy"] or account.get("session_active"):
                return JSONResponse(
                    {"detail": "Finish the account operation or disconnect its stream first."},
                    status_code=409,
                )
            try:
                manager.start(body)
            except CaptureBusy:
                return JSONResponse({"detail": "A capture is already running."}, status_code=409)
        return JSONResponse({"accepted": True}, status_code=202)

    return app


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Connect Football Memories to a local Hudl browser."
    )
    parser.add_argument(
        "--output", required=True, type=Path, help="Host folder mounted as the app inbox"
    )
    args = parser.parse_args()
    uvicorn.run(create_companion(args.output), host="127.0.0.1", port=8766, access_log=False)


if __name__ == "__main__":
    main()
