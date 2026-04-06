"""Celery tasks for Exception Management notifications."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_exception_expiry_reminders():
    """
    Notify exception requesters and approvers when an approved exception
    is expiring within 14 days or has already expired.
    """
    from django.contrib.contenttypes.models import ContentType

    from apps.core.models import Notification

    from .models import GRCException

    today = timezone.now().date()
    upcoming = today + timedelta(days=14)

    exceptions = GRCException.objects.filter(
        expiry_date__lte=upcoming,
        status="approved",
    ).select_related("requester", "approver")

    ct = ContentType.objects.get_for_model(GRCException)
    count = 0
    for exc in exceptions:
        days_until = (exc.expiry_date - today).days
        if days_until < 0:
            title = f"Exception expired: {exc.title}"
            body = f"Exception '{exc.title}' expired {abs(days_until)} days ago. Please review."
            ntype = "danger"
        else:
            title = f"Exception expiring in {days_until} days: {exc.title}"
            body = f"Exception '{exc.title}' will expire on {exc.expiry_date}."
            ntype = "warning"

        recipients = [u for u in [exc.requester, exc.approver] if u]
        for recipient in recipients:
            already = Notification.objects.filter(
                recipient=recipient,
                content_type=ct,
                object_id=str(exc.id),
                created_at__date=today,
            ).exists()
            if not already:
                Notification.objects.create(
                    recipient=recipient,
                    notification_type=ntype,
                    title=title,
                    body=body,
                    content_type=ct,
                    object_id=str(exc.id),
                )
                count += 1

    logger.info("Sent %d exception expiry reminders", count)
    return count
