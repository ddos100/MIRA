from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class AwarenessProgram(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_months = models.PositiveSmallIntegerField(null=True, blank=True)
    pass_score = models.PositiveSmallIntegerField(default=80)  # percentage

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class AwarenessContent(BaseModel):
    class ContentType(models.TextChoices):
        ARTICLE = "article", _("Article")
        VIDEO = "video", _("Video")
        PDF = "pdf", _("PDF")
        EXTERNAL_LINK = "external_link", _("External Link")

    program = models.ForeignKey(
        AwarenessProgram, on_delete=models.CASCADE, related_name="contents"
    )
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=15, choices=ContentType.choices)
    body = models.TextField(blank=True)  # article content
    file = models.FileField(upload_to="awareness/", null=True, blank=True)
    url = models.URLField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    estimated_duration_minutes = models.PositiveSmallIntegerField(default=5)

    class Meta:
        ordering = ["program", "order"]

    def __str__(self):
        return self.title


class AwarenessAssignment(BaseModel):
    program = models.ForeignKey(
        AwarenessProgram, on_delete=models.CASCADE, related_name="assignments"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="awareness_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_awareness_assignments",
    )
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)

    class Meta:
        unique_together = [("program", "user")]
        ordering = ["due_date"]

    def __str__(self):
        return f"{self.user} – {self.program}"
