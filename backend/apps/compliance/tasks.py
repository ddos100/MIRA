"""Celery tasks for Compliance Management."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_compliance_review_reminders():
    """Remind assessors of compliance assessments due for review."""
    from django.contrib.contenttypes.models import ContentType

    from apps.core.models import Notification

    from .models import ComplianceAssessment

    today = timezone.now().date()
    upcoming = today + timedelta(days=14)

    assessments = ComplianceAssessment.objects.filter(
        next_review_date__lte=upcoming,
        assessor__isnull=False,
        status__in=["compliant", "partially_compliant"],
    ).select_related("assessor", "requirement", "program")

    ct = ContentType.objects.get_for_model(ComplianceAssessment)
    count = 0
    for assessment in assessments:
        days_until = (assessment.next_review_date - today).days
        title = f"Compliance review due: {assessment.requirement.ref_code}"
        body = (
            f"Assessment for {assessment.requirement.ref_code} in "
            f"'{assessment.program.name}' is due for review."
        )
        already = Notification.objects.filter(
            recipient=assessment.assessor,
            content_type=ct,
            object_id=str(assessment.id),
            created_at__date=today,
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=assessment.assessor,
                notification_type="warning" if days_until >= 0 else "danger",
                title=title,
                body=body,
                content_type=ct,
                object_id=str(assessment.id),
            )
            count += 1

    logger.info("Sent %d compliance review reminders", count)
    return count
