"""Celery tasks for Policy Management notifications."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_policy_review_reminders():
    """Notify policy owners when a policy review is due within 14 days or overdue."""
    from apps.core.models import Notification
    from django.contrib.contenttypes.models import ContentType

    from .models import Policy

    today = timezone.now().date()
    upcoming = today + timedelta(days=14)

    policies = Policy.objects.filter(
        review_date__lte=upcoming,
        status__in=["active", "draft"],
        owner__isnull=False,
    ).select_related("owner")

    ct = ContentType.objects.get_for_model(Policy)
    count = 0
    for policy in policies:
        days_until = (policy.review_date - today).days
        if days_until < 0:
            title = f"Policy review overdue: {policy.title}"
            body = f"The review for policy '{policy.title}' was due {abs(days_until)} days ago."
            ntype = "danger"
        else:
            title = f"Policy review due in {days_until} days: {policy.title}"
            body = f"Policy '{policy.title}' is due for review on {policy.review_date}."
            ntype = "warning"

        already = Notification.objects.filter(
            recipient=policy.owner,
            content_type=ct,
            object_id=str(policy.id),
            created_at__date=today,
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=policy.owner,
                notification_type=ntype,
                title=title,
                body=body,
                content_type=ct,
                object_id=str(policy.id),
            )
            count += 1

    logger.info("Sent %d policy review reminders", count)
    return count
