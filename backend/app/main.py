from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Scope, Receive, Send

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
    title="Auto Video Editor API",
    description="Backend API for Daily Video Editing Automation",
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Auto Video Editor API"}

# Include routers
from app.routers import videos, settings, dashboard, fs, output, groups
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(output.router, prefix="/api/outputs", tags=["Outputs"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(fs.router, prefix="/api/fs", tags=["FileSystem"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])

# Wrap the app to guarantee CORS headers on error responses (e.g. 500)
app = CORSOnErrorMiddleware(app)
