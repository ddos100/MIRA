"""Celery tasks for async agent execution."""
import asyncio
from typing import Dict
from app.tasks.celery_app import celery_app


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="app.tasks.agent_tasks.run_orchestration")
def run_orchestration(self, run_id: str, scope: Dict) -> Dict:
    """Main task: execute a full orchestration run."""
    from app.database import AsyncSessionLocal
    from app.agents.orchestrator import Orchestrator

    async def _inner():
        async with AsyncSessionLocal() as db:
            orchestrator = Orchestrator(db=db)
            return await orchestrator.run(run_id=run_id, scope=scope)

    return _run_async(_inner())


@celery_app.task(name="app.tasks.agent_tasks.parse_document")
def parse_document(document_id: str) -> None:
    """Parse a document and ingest into ChromaDB."""
    from app.database import AsyncSessionLocal
    from app.documents.parser import parse_and_ingest

    async def _inner():
        async with AsyncSessionLocal() as db:
            await parse_and_ingest(document_id=document_id, db=db)

    _run_async(_inner())
