"""Global Settings router — API keys untuk OpenAI & DeepSeek."""
import json
import os
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import set_key
from app.paths import GLOBAL_SETTINGS_FILE, BACKEND_DIR

router = APIRouter()

# .env file path (untuk kompatibilitas dengan os.getenv + pydantic Settings)
ENV_PATH = os.path.join(BACKEND_DIR, ".env")


class GlobalSettingsUpdate(BaseModel):
    openai_api_key: str | None = None
    deepseek_api_key: str | None = None


def _read_settings():
    if os.path.exists(GLOBAL_SETTINGS_FILE):
        with open(GLOBAL_SETTINGS_FILE, "r") as f:
            return json.load(f)
    # Fallback: baca dari environment
    return {
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "deepseek_api_key": os.getenv("DEEPSEEK_API_KEY", ""),
    }


@router.get("/")
def get_settings():
    data = _read_settings()
    return {
        "openai_api_key": data.get("openai_api_key", ""),
        "deepseek_api_key": data.get("deepseek_api_key", ""),
    }


@router.put("/")
def update_settings(settings: GlobalSettingsUpdate):
    # 1. Simpan ke global_settings.json (dipakai tasks/services)
    data = _read_settings()
    if settings.openai_api_key is not None:
        data["openai_api_key"] = settings.openai_api_key
    if settings.deepseek_api_key is not None:
        data["deepseek_api_key"] = settings.deepseek_api_key
    os.makedirs(os.path.dirname(GLOBAL_SETTINGS_FILE), exist_ok=True)
    with open(GLOBAL_SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)

    # 2. Tulis juga ke .env (dipakai pydantic Settings + os.getenv)
    if os.path.exists(ENV_PATH):
        if settings.openai_api_key is not None:
            set_key(ENV_PATH, "OPENAI_API_KEY", settings.openai_api_key)
        if settings.deepseek_api_key is not None:
            set_key(ENV_PATH, "DEEPSEEK_API_KEY", settings.deepseek_api_key)

    # 3. Update environment variable in-process
    if settings.openai_api_key is not None:
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
    if settings.deepseek_api_key is not None:
        os.environ["DEEPSEEK_API_KEY"] = settings.deepseek_api_key

    return {"message": "Settings updated successfully"}
