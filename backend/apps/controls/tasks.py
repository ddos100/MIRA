"""Celery tasks for Internal Controls notifications."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_control_audit_reminders():
    """Notify control owners when the next review/audit date is within 7 days or overdue."""
    from django.contrib.contenttypes.models import ContentType

    from apps.core.models import Notification

    from .models import Control

    today = timezone.now().date()
    upcoming = today + timedelta(days=7)

    controls = Control.objects.filter(
        next_review_date__lte=upcoming,
        status__in=["active", "needs_review"],
        owner__isnull=False,
    ).select_related("owner")

    ct = ContentType.objects.get_for_model(Control)
    count = 0
    for control in controls:
        days_until = (control.next_review_date - today).days
        if days_until < 0:
            title = f"Control audit overdue: {control.title}"
            body = f"The audit for control '{control.title}' was due {abs(days_until)} days ago."
            ntype = "danger"
        else:
            title = f"Control audit due in {days_until} days: {control.title}"
            body = f"Control '{control.title}' is due for audit on {control.next_review_date}."
            ntype = "warning"

        already = Notification.objects.filter(
            recipient=control.owner,
            content_type=ct,
            object_id=str(control.id),
            created_at__date=today,
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=control.owner,
                notification_type=ntype,
                title=title,
                body=body,
                content_type=ct,
                object_id=str(control.id),
            )
            count += 1

    logger.info("Sent %d control audit reminders", count)
    return count
