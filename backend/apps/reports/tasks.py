import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_report_export(self, export_id: str):
    """Generate a report export file (PDF/Excel/CSV)."""
    from .models import ReportExport

    try:
        export = ReportExport.objects.select_related("report").get(id=export_id)
        export.status = ReportExport.ExportStatus.PROCESSING
        export.save(update_fields=["status"])

        # TODO: implement actual PDF/Excel generation with WeasyPrint / openpyxl
        logger.info("Generating %s export for report '%s'", export.export_format, export.report.name)

        export.status = ReportExport.ExportStatus.COMPLETED
        export.completed_at = timezone.now()
        export.save(update_fields=["status", "completed_at"])

    except ReportExport.DoesNotExist:
        logger.error("ReportExport %s not found", export_id)
    except Exception as exc:
        logger.exception("Failed to generate report export %s", export_id)
        from .models import ReportExport as RE
        RE.objects.filter(id=export_id).update(
            status=RE.ExportStatus.FAILED,
            error_message=str(exc),
        )
        raise self.retry(exc=exc, countdown=60)


@shared_task
def run_scheduled_reports():
    """Celery beat task: find due scheduled reports and generate them."""
    from .models import ReportSchedule

    now = timezone.now()
    due = ReportSchedule.objects.filter(is_active=True, next_run_at__lte=now)
    for schedule in due:
        generate_report_export.delay_on_commit = False
        from .models import ReportExport
        export = ReportExport.objects.create(
            report=schedule.report,
            export_format=schedule.export_format,
        )
        generate_report_export.delay(str(export.id))
        # Advance next_run_at
        delta_map = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30),
            "quarterly": timedelta(days=90),
        }
        schedule.last_run_at = now
        schedule.next_run_at = now + delta_map.get(schedule.frequency, timedelta(days=30))
        schedule.save(update_fields=["last_run_at", "next_run_at"])
