import secrets

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class AssessmentTemplate(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class Question(BaseModel):
    class QuestionType(models.TextChoices):
        TEXT = "text", _("Text")
        TEXTAREA = "textarea", _("Textarea")
        MCQ = "mcq", _("Multiple Choice")
        SCALE = "scale", _("Scale 1-5")
        YES_NO = "yes_no", _("Yes/No")
        FILE = "file", _("File Upload")

    template = models.ForeignKey(
        AssessmentTemplate, on_delete=models.CASCADE, related_name="questions"
    )
    text = models.TextField()
    question_type = models.CharField(
        max_length=10, choices=QuestionType.choices, default=QuestionType.TEXT
    )
    options = models.JSONField(default=list, blank=True)  # for MCQ
    is_required = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)

    class Meta:
        ordering = ["template", "order"]

    def __str__(self):
        return f"{self.template.title}: Q{self.order}"


class Assessment(BaseModel):
    class AssessmentStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SENT = "sent", _("Sent")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        EXPIRED = "expired", _("Expired")

    template = models.ForeignKey(
        AssessmentTemplate, on_delete=models.CASCADE, related_name="assessments"
    )
    title = models.CharField(max_length=255)
    respondent_name = models.CharField(max_length=200, blank=True)
    respondent_email = models.EmailField(blank=True)
    respondent_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assessments",
    )
    third_party = models.ForeignKey(
        "third_parties.ThirdParty",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assessments",
    )
    status = models.CharField(
        max_length=15, choices=AssessmentStatus.choices, default=AssessmentStatus.DRAFT
    )
    token = models.CharField(max_length=64, unique=True, blank=True, db_index=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} – {self.respondent_email}"

    def portal_url(self) -> str:
        """Shareable external portal URL for this assessment."""
        return f"/portal/assessment/{self.token}"


class AssessmentResponse(BaseModel):
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="responses"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="responses"
    )
    answer_text = models.TextField(blank=True)
    answer_data = models.JSONField(null=True, blank=True)  # for MCQ/scale etc
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = [("assessment", "question")]

    def __str__(self):
        return f"Response to {self.question} in {self.assessment}"
