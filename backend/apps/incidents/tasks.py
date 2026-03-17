"""Celery tasks for Incident Management."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def check_gdpr_breach_notifications():
    """Alert on data breaches that haven't been notified within 72 hours (GDPR Art. 33)."""
    from .models import Incident
    from apps.core.models import Notification
    from django.contrib.contenttypes.models import ContentType

    deadline = timezone.now() - timedelta(hours=72)
    breaches = Incident.objects.filter(
        is_data_breach=True,
        gdpr_notification_required=True,
        gdpr_notification_sent_at__isnull=True,
        detected_at__lte=deadline,
        status__in=["new", "triaged", "investigating", "contained"],
        owner__isnull=False,
    ).select_related("owner")

    ct = ContentType.objects.get_for_model(Incident)
    count = 0
    for incident in breaches:
        already = Notification.objects.filter(
            recipient=incident.owner,
            content_type=ct,
            object_id=str(incident.id),
            created_at__gte=timezone.now() - timedelta(hours=4),
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=incident.owner,
                notification_type="danger",
                title=f"GDPR 72h breach notification overdue: {incident.title}",
                body=(
                    f"Data breach '{incident.title}' detected on "
                    f"{incident.detected_at.strftime('%Y-%m-%d %H:%M')} has exceeded "
                    "the 72-hour GDPR notification deadline (Article 33)."
                ),
                content_type=ct,
                object_id=str(incident.id),
            )
            count += 1

    logger.info("Checked GDPR notifications: %d overdue", count)
    return count


@shared_task
def update_overdue_incident_slas():
    """Mark open incidents as overdue based on severity SLAs."""
    from .models import Incident

    sla_hours = {"p1": 4, "p2": 24, "p3": 72, "p4": 168}
    now = timezone.now()
    updated = 0
    for severity, hours in sla_hours.items():
        deadline = now - timedelta(hours=hours)
        count = Incident.objects.filter(
            severity=severity,
            status__in=["new", "triaged"],
            created_at__lte=deadline,
        ).count()
        if count:
            logger.warning("%d %s incidents are past their SLA (%dh)", count, severity.upper(), hours)
            updated += count

    return updated
