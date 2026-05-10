from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "conductor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.agent_tasks", "app.tasks.sync_tasks", "app.tasks.report_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "scheduled-connector-sync": {
            "task": "app.tasks.sync_tasks.sync_all_active_connectors",
            "schedule": 3600.0,  # every hour
        },
    },
)
