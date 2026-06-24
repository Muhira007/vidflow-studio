from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import set_key, dotenv_values
import os
from app.paths import BACKEND_DIR

router = APIRouter()

# Path to the .env file
ENV_PATH = os.path.join(BACKEND_DIR, ".env")

class GlobalSettingsUpdate(BaseModel):
    openai_api_key: str | None = None
    deepseek_api_key: str | None = None

@router.get("/")
def get_settings():
    # Read current .env
    env_dict = dotenv_values(ENV_PATH) if os.path.exists(ENV_PATH) else {}
    return {
        "openai_api_key": env_dict.get("OPENAI_API_KEY", ""),
        "deepseek_api_key": env_dict.get("DEEPSEEK_API_KEY", "")
    }

@router.put("/")
def update_settings(settings: GlobalSettingsUpdate):
    if not os.path.exists(ENV_PATH):
        # Create empty .env if not exists
        with open(ENV_PATH, 'w') as f:
            pass

    if settings.openai_api_key is not None:
        set_key(ENV_PATH, "OPENAI_API_KEY", settings.openai_api_key)
    if settings.deepseek_api_key is not None:
        set_key(ENV_PATH, "DEEPSEEK_API_KEY", settings.deepseek_api_key)

    return {"message": "Settings updated successfully"}
