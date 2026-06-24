import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.types import ASGIApp, Scope, Receive, Send
from sqlalchemy import text


class CORSOnErrorMiddleware:
    """Ensure CORS headers are present on ALL responses, including 500 errors.

    Starlette's ServerErrorMiddleware catches exceptions and generates 500
    responses that bypass the regular CORSMiddleware. This wrapper sits
    outside ServerErrorMiddleware to guarantee CORS headers on every response.
    """
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_cors(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in message.get("headers", [])}
                if "access-control-allow-origin" not in headers:
                    message["headers"] = list(message.get("headers", []))
                    message["headers"].append((b"access-control-allow-origin", b"*"))
                    message["headers"].append((b"access-control-allow-methods", b"*"))
                    message["headers"].append((b"access-control-allow-headers", b"*"))
            await send(message)

        await self.app(scope, receive, send_with_cors)


app = FastAPI(
    title="Vidflow Studio API",
    description="Automated affiliate video editing with streamlined workflow automation",
    version="1.0.0"
)

# Setup CORS (for normal responses — 500 errors are handled by CORSOnErrorMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Public endpoints (no auth) ───

@app.get("/")
def read_root():
    return {"message": "Welcome to Vidflow Studio API"}


@app.get("/api/health")
def health_check():
    """Health check endpoint untuk monitoring."""
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.config import settings

    result = {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Check DB
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        result["database"] = "ok"
    except Exception as e:
        result["database"] = f"error: {str(e)[:100]}"
        result["status"] = "degraded"

    # Check Redis
    try:
        import redis as redis_lib
        r = redis_lib.from_url(settings.redis_url)
        r.ping()
        result["redis"] = "ok"
    except Exception as e:
        result["redis"] = f"error: {str(e)[:100]}"
        result["status"] = "degraded"

    return result


# ─── Public stream endpoint (no auth — dipakai <video> tag) ───
from fastapi.responses import FileResponse  # noqa: E402
from app.paths import SOURCE_DIR, TMP_DIR, OUTPUT_DIR  # noqa: E402


@app.get("/api/fs/stream/{folder}/{filename}")
def public_stream(folder: str, filename: str):
    """Stream video file — PUBLIC (no auth) karena dipakai <video> tag."""
    if ".." in folder or ".." in filename or "/" in folder:
        raise HTTPException(status_code=400, detail="Invalid path")  # noqa: F821

    search_dirs = [
        os.path.join(SOURCE_DIR, folder, filename),
        os.path.join(TMP_DIR, folder, filename),
        os.path.join(OUTPUT_DIR, folder, filename),
    ]

    for candidate in search_dirs:
        if os.path.isfile(candidate):
            ext = candidate.rsplit(".", 1)[-1].lower() if "." in candidate else "mp4"
            media_types = {
                "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
                "mkv": "video/x-matroska", "avi": "video/x-msvideo",
                "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            }
            return FileResponse(candidate, media_type=media_types.get(ext, "video/mp4"))

    raise HTTPException(status_code=404, detail="File not found")  # noqa: F821


# ─── Auth router (public — login endpoint) ───
from app.routers import auth  # noqa: E402
from app.auth import init_admin_password, verify_token  # noqa: E402

# Init admin password hash on startup
init_admin_password()

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


# ─── Protected API routers (JWT required) ───
from app.routers import videos, settings, dashboard, fs, output, groups  # noqa: E402

PROTECTED = [Depends(verify_token)]

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"], dependencies=PROTECTED)
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"], dependencies=PROTECTED)
app.include_router(output.router, prefix="/api/outputs", tags=["Outputs"], dependencies=PROTECTED)
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"], dependencies=PROTECTED)
app.include_router(fs.router, prefix="/api/fs", tags=["FileSystem"], dependencies=PROTECTED)
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"], dependencies=PROTECTED)

# Wrap the app to guarantee CORS headers on error responses (e.g. 500)
app = CORSOnErrorMiddleware(app)
