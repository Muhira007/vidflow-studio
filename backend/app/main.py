from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Auto Video Editor API",
    description="Backend API for Daily Video Editing Automation",
    version="1.0.0"
)

# Setup CORS
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
from app.routers import videos, settings, dashboard, fs
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(fs.router, prefix="/api/fs", tags=["FileSystem"])
