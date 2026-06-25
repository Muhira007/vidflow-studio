"""Central path configuration. All directories resolved from APP_HOME env var.

Local dev:  APP_HOME defaults to /home/kangdemuh/aplikasi/vidflow
Docker:     APP_HOME=/home/app (set in docker-compose.yml)
"""
import os

APP_HOME = os.getenv("APP_HOME", "/home/kangdemuh/aplikasi/vidflow")

SOURCE_DIR = os.path.join(APP_HOME, "source")
OUTPUT_DIR = os.path.join(APP_HOME, "output")
TMP_DIR = os.path.join(APP_HOME, "tmp")
BACKEND_DIR = os.path.join(APP_HOME, "backend")
LOGS_DIR = os.path.join(APP_HOME, "logs")

# Global settings file (stored in backend/app/)
GLOBAL_SETTINGS_FILE = os.path.join(BACKEND_DIR, "app", "global_settings.json")

# Frontend cover templates
COVER_TEMPLATES_DIR = os.path.join(APP_HOME, "frontend", "public", "covers")
