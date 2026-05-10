"""Celery beat tasks for scheduled connector syncs."""
import asyncio
from app.tasks.celery_app import celery_app


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.sync_tasks.sync_all_active_connectors")
def sync_all_active_connectors() -> dict:
    """Scheduled task: run all active connectors that have a sync_schedule set."""
    from app.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.integration import Connector

    async def _inner():
        results = {}
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Connector).where(
                    Connector.is_active == True,
                    Connector.sync_schedule != None,
                )
            )
            connectors = list(result.scalars())
            for connector in connectors:
                try:
                    from app.services.connector_factory import build_connector
                    conn = await build_connector(connector, db)
                    data = await conn.collect()
                    results[connector.name] = {"status": "ok", "records": len(data)}
                except Exception as exc:
                    results[connector.name] = {"status": "error", "error": str(exc)}
        return results

    return _run_async(_inner())
