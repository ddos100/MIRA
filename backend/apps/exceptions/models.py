from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel


class GRCException(BaseModel):
    class ExceptionType(models.TextChoices):
        RISK = "risk", _("Risk")
        COMPLIANCE = "compliance", _("Compliance")
        POLICY = "policy", _("Policy")
        CONTROL = "control", _("Control")

    class ExceptionStatus(models.TextChoices):
        PENDING = "pending", _("Pending Approval")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")
        EXPIRED = "expired", _("Expired")
        REVOKED = "revoked", _("Revoked")

    title = models.CharField(max_length=255)
    description = models.TextField()
    exception_type = models.CharField(max_length=20, choices=ExceptionType.choices)
    status = models.CharField(
        max_length=20, choices=ExceptionStatus.choices, default=ExceptionStatus.PENDING
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="requested_exceptions",
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_exceptions",
    )
    justification = models.TextField()
    compensating_controls = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    is_expired = models.BooleanField(default=False, db_index=True)
    risk = models.ForeignKey(
        "risks.Risk",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exceptions",
    )
    compliance_requirement = models.ForeignKey(
        "compliance.Requirement",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exceptions",
    )
    policy = models.ForeignKey(
        "policies.Policy",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exceptions",
    )
    control = models.ForeignKey(
        "controls.Control",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exceptions",
    )

    class Meta:
        verbose_name = _("Exception")
        verbose_name_plural = _("Exceptions")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
