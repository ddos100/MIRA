from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class IncidentCategory(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("Incident Category")

    def __str__(self):
        return self.name


class Incident(BaseModel):
    class Severity(models.TextChoices):
        P1 = "p1", _("P1 – Critical")
        P2 = "p2", _("P2 – High")
        P3 = "p3", _("P3 – Medium")
        P4 = "p4", _("P4 – Low")

    class IncidentStatus(models.TextChoices):
        NEW = "new", _("New")
        TRIAGED = "triaged", _("Triaged")
        INVESTIGATING = "investigating", _("Investigating")
        CONTAINED = "contained", _("Contained")
        RESOLVED = "resolved", _("Resolved")
        CLOSED = "closed", _("Closed")

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(
        IncidentCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="incidents",
    )
    severity = models.CharField(
        max_length=5, choices=Severity.choices, default=Severity.P3
    )
    status = models.CharField(
        max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.NEW
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_incidents",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reported_incidents",
    )
    detected_at = models.DateTimeField(null=True, blank=True)
    reported_at = models.DateTimeField(null=True, blank=True)
    contained_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    is_data_breach = models.BooleanField(default=False)
    gdpr_notification_required = models.BooleanField(default=False)
    breach_notification_deadline = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("72-hour SA Notification Deadline"),
        help_text=_("Art. 33 – auto-set to detected_at + 72 h when is_data_breach is True"),
    )
    gdpr_notification_sent_at = models.DateTimeField(null=True, blank=True)
    assets_affected = models.ManyToManyField(
        "assets.Asset", blank=True, related_name="incidents"
    )
    risks_raised = models.ManyToManyField(
        "risks.Risk", blank=True, related_name="incidents"
    )
    lessons_learned = models.TextField(blank=True)
    root_cause = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Incident")
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.is_data_breach and self.detected_at and not self.breach_notification_deadline:
            self.breach_notification_deadline = self.detected_at + timedelta(hours=72)
        super().save(*args, **kwargs)

    @property
    def is_breach_notification_overdue(self) -> bool:
        if not self.gdpr_notification_required or self.gdpr_notification_sent_at:
            return False
        if not self.breach_notification_deadline:
            return False
        return timezone.now() > self.breach_notification_deadline

    def __str__(self):
        return f"[{self.severity}] {self.title}"


class IncidentUpdate(BaseModel):
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name="updates"
    )
    body = models.TextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Update on {self.incident.title}"
