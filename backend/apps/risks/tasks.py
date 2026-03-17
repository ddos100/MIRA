"""Celery tasks for Risk Management."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_risk_review_reminders():
    """Send reminders for risks whose review date is within 7 days or overdue."""
    from .models import Risk
    from apps.core.models import Notification
    from django.contrib.contenttypes.models import ContentType

    today = timezone.now().date()
    upcoming = today + timedelta(days=7)

    risks = Risk.objects.filter(
        review_date__lte=upcoming,
        status__in=["open", "in_treatment"],
        owner__isnull=False,
    ).select_related("owner")

    ct = ContentType.objects.get_for_model(Risk)
    count = 0
    for risk in risks:
        days_until = (risk.review_date - today).days
        if days_until < 0:
            title = f"Risk review overdue: {risk.title}"
            body = f"The review for risk '{risk.title}' was due {abs(days_until)} days ago."
            ntype = "danger"
        else:
            title = f"Risk review due in {days_until} days: {risk.title}"
            body = f"The review for risk '{risk.title}' is due on {risk.review_date}."
            ntype = "warning"

        # Avoid duplicating notifications created today
        already = Notification.objects.filter(
            recipient=risk.owner,
            content_type=ct,
            object_id=str(risk.id),
            created_at__date=today,
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=risk.owner,
                notification_type=ntype,
                title=title,
                body=body,
                content_type=ct,
                object_id=str(risk.id),
            )
            count += 1

    logger.info("Sent %d risk review reminders", count)
    return count


@shared_task
def send_treatment_plan_reminders():
    """Notify owners of treatment plans due within 7 days."""
    from .models import RiskTreatmentPlan
    from apps.core.models import Notification
    from django.contrib.contenttypes.models import ContentType

    today = timezone.now().date()
    upcoming = today + timedelta(days=7)

    plans = RiskTreatmentPlan.objects.filter(
        due_date__lte=upcoming,
        status__in=["pending", "in_progress"],
        owner__isnull=False,
    ).select_related("owner", "risk")

    ct = ContentType.objects.get_for_model(RiskTreatmentPlan)
    count = 0
    for plan in plans:
        days_until = (plan.due_date - today).days
        title = (
            f"Treatment plan overdue: {plan.title}"
            if days_until < 0
            else f"Treatment plan due in {days_until} days: {plan.title}"
        )
        already = Notification.objects.filter(
            recipient=plan.owner,
            content_type=ct,
            object_id=str(plan.id),
            created_at__date=today,
        ).exists()
        if not already:
            Notification.objects.create(
                recipient=plan.owner,
                notification_type="warning" if days_until >= 0 else "danger",
                title=title,
                body=f"Risk: {plan.risk.title}",
                content_type=ct,
                object_id=str(plan.id),
            )
            count += 1

    logger.info("Sent %d treatment plan reminders", count)
    return count
