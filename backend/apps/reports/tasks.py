import logging
from datetime import timedelta

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_report_export(self, export_id: str):
    """Generate a report export file (PDF / Excel / CSV) asynchronously."""
    from .models import ReportExport
    from .reporter import (
        generate_csv_bytes,
        generate_excel_bytes,
        generate_pdf_bytes,
        get_module_data,
    )

    try:
        export = ReportExport.objects.select_related("report").get(id=export_id)
        export.status = ReportExport.ExportStatus.PROCESSING
        export.save(update_fields=["status"])

        report = export.report
        fmt = export.export_format.lower()

        logger.info(
            "Generating %s export for report '%s' (module=%s)",
            fmt,
            report.name,
            report.module,
        )

        fields, rows = get_module_data(
            module=report.module,
            filters=report.filters or {},
            fields=report.fields or [],
            ordering=report.ordering or "",
        )

        if fmt == "pdf":
            content = generate_pdf_bytes(report.name, fields, rows)
            filename = f"{report.name}.pdf"
            content_type = "application/pdf"
        elif fmt == "excel":
            content = generate_excel_bytes(report.name, fields, rows)
            filename = f"{report.name}.xlsx"
            content_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        else:  # csv (default)
            content = generate_csv_bytes(fields, rows)
            filename = f"{report.name}.csv"
            content_type = "text/csv"

        export.file.save(filename, ContentFile(content), save=False)
        export.status = ReportExport.ExportStatus.COMPLETED
        export.completed_at = timezone.now()
        export.save(update_fields=["status", "completed_at", "file"])

        logger.info("Export %s completed: %s (%d rows)", export_id, filename, len(rows))

        # Send email if this came from a schedule
        if hasattr(export, "_schedule_recipients") and export._schedule_recipients:
            _email_export(export, content, filename, content_type)

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


def _email_export(export, content: bytes, filename: str, content_type: str):
    """Email a completed export to the schedule's recipients."""
    from django.conf import settings
    from django.core.mail import EmailMessage

    for schedule in export.report.schedules.filter(is_active=True):
        recipients = schedule.recipients or []
        if not recipients:
            continue
        msg = EmailMessage(
            subject=f"[MIRA GRC] Scheduled Report: {export.report.name}",
            body=(
                f"Your scheduled report '{export.report.name}' is attached.\n\n"
                f"Generated: {export.completed_at}\n"
                f"Records: attached file"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
        )
        msg.attach(filename, content, content_type)
        msg.send(fail_silently=True)


@shared_task
def run_scheduled_reports():
    """Celery beat task: find due scheduled reports and generate them."""
    from .models import ReportExport, ReportSchedule

    now = timezone.now()
    due = ReportSchedule.objects.filter(
        is_active=True, next_run_at__lte=now
    ).select_related("report")
    for schedule in due:
        export = ReportExport.objects.create(
            report=schedule.report,
            export_format=schedule.export_format,
        )
        generate_report_export.delay(str(export.id))

        delta_map = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30),
            "quarterly": timedelta(days=90),
        }
        schedule.last_run_at = now
        schedule.next_run_at = now + delta_map.get(
            schedule.frequency, timedelta(days=30)
        )
        schedule.save(update_fields=["last_run_at", "next_run_at"])
        logger.info(
            "Scheduled report '%s' queued (export id=%s)",
            schedule.report.name,
            export.id,
        )
