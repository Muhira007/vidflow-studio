from celery import Celery
from app.config import settings

celery_app = Celery(
    "vidflow_studio",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks"]
)

# Optional celery configurations
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Jakarta",
    enable_utc=True,
    # ── Sequential processing: one task at a time ──
    worker_prefetch_multiplier=1,   # only fetch 1 task per worker
    task_acks_late=True,            # acknowledge AFTER completion (not before)
    task_track_started=True,
)
