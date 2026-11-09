"""Desktop bridge for a Docker-hosted UI; never accepts credentials or sessions."""

from __future__ import annotations

import argparse
import threading
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Literal

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.connectors.hudl_browser import match_id, run
from app.connectors.hudl_capture import CaptureError

ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
}


class CaptureRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    url: str = Field(max_length=500)
    max_height: Literal[360, 480, 540, 720, 1080, 2160] = 720
    player_codes: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("url")
    @classmethod
    def valid_match(cls, value: str) -> str:
        match_id(value)
        return value


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
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.state.capture = CaptureManager(output.expanduser().resolve())
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
        if (
            request.headers.get("host") not in {"127.0.0.1:8766", "localhost:8766"}
            or origin not in ORIGINS
        ):
            return JSONResponse(
                {"detail": "Only the local Football Memories app can use this helper."},
                status_code=403,
            )
        if request.method == "POST" and (
            request.headers.get("content-type") != "application/json"
            or int(request.headers.get("content-length", "0")) > 8192
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

    @app.get("/status")
    def status(request: Request) -> dict[str, str | None]:
        manager: CaptureManager = request.app.state.capture
        return manager.status()

    @app.post("/capture", status_code=202)
    def capture(body: CaptureRequest, request: Request) -> JSONResponse:
        manager: CaptureManager = request.app.state.capture
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
