from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    app_name: str = "Auto Video Editor"
    
    # Database Settings
    database_url: str = "postgresql://postgres:postgres@localhost:5433/auto_video_editor"
    
    # Celery & Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    
    # External APIs
    openai_api_key: str | None = None
    
    class Config:
        env_file = ".env"

settings = Settings()
