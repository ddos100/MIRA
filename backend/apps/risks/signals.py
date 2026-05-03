"""
Risk appetite breach notifications (ISO 31000 / COSO ERM).

Fires an in-app DANGER notification when a Risk's residual score exceeds
the RED threshold defined on the matching RiskAppetite for its category.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="risks.Risk")
def check_risk_appetite_breach(sender, instance, created, **kwargs):
    from apps.core.models import Notification
    from .models import RiskAppetite

    if not instance.category_id:
        return

    appetite = (
        RiskAppetite.objects.filter(
            category_id=instance.category_id,
            approval_status=RiskAppetite.ApprovalStatus.APPROVED,
        )
        .order_by("-created_at")
        .first()
    )
    if appetite is None:
        return

    if instance.residual_score >= appetite.threshold_red and instance.owner_id:
        # Avoid duplicate notifications for the same breach
        already_notified = Notification.objects.filter(
            recipient_id=instance.owner_id,
            title__startswith="Risk appetite breach:",
            body__contains=str(instance.id),
            is_read=False,
        ).exists()
        if not already_notified:
            Notification.objects.create(
                recipient_id=instance.owner_id,
                notification_type=Notification.NotificationType.DANGER,
                title=f"Risk appetite breach: {instance.title}",
                body=(
                    f"Risk '{instance.title}' (id {instance.id}) has a residual score "
                    f"of {instance.residual_score}, exceeding the RED threshold "
                    f"({appetite.threshold_red}) for appetite '{appetite.name}'."
                ),
            )
