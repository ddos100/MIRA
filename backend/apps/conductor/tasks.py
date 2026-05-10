"""
Celery tasks for MIRA Conductor.
All async agent code runs via asyncio.new_event_loop() in Celery workers.
"""
import asyncio
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="conductor.run_orchestration", max_retries=0,
             soft_time_limit=3600, time_limit=3700)
def run_orchestration(self, run_id: str, scope: dict):
    """Main orchestration task — runs all agents sequentially."""
    from apps.conductor.agents.orchestrator import Orchestrator
    from apps.conductor.models import AiAgentRun

    # Pre-flight: check if Conductor is enabled
    from django.conf import settings
    if not getattr(settings, "CONDUCTOR_ENABLED", False):
        AiAgentRun.objects.filter(id=run_id).update(
            status="failed", error_message="CONDUCTOR_ENABLED is False"
        )
        return

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(Orchestrator().run(run_id, scope))
    except Exception as exc:
        logger.error("Orchestration task failed for run %s: %s", run_id, exc)
        AiAgentRun.objects.filter(id=run_id).update(
            status="failed",
            error_message=str(exc)[:2000],
            completed_at=timezone.now(),
        )
    finally:
        loop.close()


@shared_task(bind=True, name="conductor.parse_document", max_retries=2,
             soft_time_limit=300, time_limit=310)
def parse_document(self, document_id: str):
    """Parse and ingest a document into ChromaDB."""
    from apps.conductor.documents.parser import parse_and_ingest

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(parse_and_ingest(document_id))
    except Exception as exc:
        logger.error("Document parse task failed for %s: %s", document_id, exc)
        from apps.conductor.models import AiDocument
        AiDocument.objects.filter(id=document_id).update(
            parse_status="failed", parse_error=str(exc)[:2000]
        )
        raise self.retry(exc=exc, countdown=30)
    finally:
        loop.close()


@shared_task(name="conductor.sync_connector")
def sync_connector(connector_id: str):
    """Run collection for a single connector."""
    from apps.conductor.models import AiConnector, AiConnectorRun
    from apps.conductor.services.connector_factory import build_connector

    try:
        connector = AiConnector.objects.prefetch_related("credentials").get(id=connector_id, is_active=True)
    except AiConnector.DoesNotExist:
        return

    run = AiConnectorRun.objects.create(
        connector=connector, trigger="manual", status="running", started_at=timezone.now()
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        instance = build_connector(connector)
        if not instance:
            run.status = "failed"
            run.error_message = "Could not build connector"
        else:
            results = loop.run_until_complete(instance.collect())
            run.status = "completed"
            run.records_collected = len(results)
            run.result_summary = {"items": results[:10]}
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)[:2000]
        logger.error("Connector sync failed %s: %s", connector_id, exc)
    finally:
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "records_collected", "result_summary", "completed_at", "error_message", "updated_at"])
        loop.close()


@shared_task(name="conductor.sync_all_active_connectors")
def sync_all_active_connectors():
    """Scheduled task: sync all active non-webhook connectors."""
    from apps.conductor.models import AiConnector
    from django.conf import settings
    if not getattr(settings, "CONDUCTOR_ENABLED", False):
        return
    connectors = AiConnector.objects.filter(is_active=True).exclude(connector_type="webhook")
    for c in connectors:
        sync_connector.delay(str(c.id))


@shared_task(name="conductor.export_report_pdf")
def export_report_pdf(report_id: str):
    """Generate PDF for an AI report using WeasyPrint."""
    from apps.conductor.models import AiReport, AiReportSection
    from django.conf import settings
    from pathlib import Path

    try:
        report = AiReport.objects.prefetch_related("sections").get(id=report_id)
    except AiReport.DoesNotExist:
        return

    pdf_dir = Path(settings.MEDIA_ROOT) / "conductor" / "reports"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"{report_id}.pdf"

    # Build HTML
    sections_html = "".join(
        f"<h2>{s.title}</h2><pre style='white-space:pre-wrap'>{s.content}</pre>"
        for s in report.sections.all()
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>{report.title}</title>
    <style>body{{font-family:sans-serif;margin:40px}} h1{{color:#1e3a5f}} pre{{background:#f5f5f5;padding:12px;border-radius:4px}}</style>
    </head><body>
    <h1>{report.title}</h1>
    <p>Generated: {report.generated_at or "—"} | Score: {report.compliance_score or "N/A"}%</p>
    {sections_html}
    </body></html>"""

    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(str(pdf_path))
    except ImportError:
        # Fall back to saving HTML
        pdf_path = pdf_path.with_suffix(".html")
        pdf_path.write_text(html)

    report.pdf_path = str(pdf_path)
    report.save(update_fields=["pdf_path", "updated_at"])
