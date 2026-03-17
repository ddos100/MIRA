from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class ProcessingActivity(BaseModel):
    """GDPR Article 30 Record of Processing Activities."""

    class LegalBasis(models.TextChoices):
        CONSENT = "consent", _("Consent")
        CONTRACT = "contract", _("Contract")
        LEGAL_OBLIGATION = "legal_obligation", _("Legal Obligation")
        VITAL_INTERESTS = "vital_interests", _("Vital Interests")
        PUBLIC_TASK = "public_task", _("Public Task")
        LEGITIMATE_INTERESTS = "legitimate_interests", _("Legitimate Interests")

    name = models.CharField(max_length=255)
    description = models.TextField()
    controller = models.CharField(max_length=255, blank=True)
    processor = models.CharField(max_length=255, blank=True)
    purpose = models.TextField()
    legal_basis = models.CharField(max_length=30, choices=LegalBasis.choices)
    data_subjects = models.TextField()  # comma/newline separated categories
    personal_data_categories = models.TextField()
    special_category_data = models.BooleanField(default=False)
    retention_period = models.CharField(max_length=100, blank=True)
    third_party_recipients = models.ManyToManyField(
        "third_parties.ThirdParty",
        blank=True,
        related_name="processing_activities",
    )
    cross_border_transfer = models.BooleanField(default=False)
    transfer_safeguards = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="processing_activities",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Processing Activity")
        verbose_name_plural = _("Processing Activities")
        ordering = ["name"]

    def __str__(self):
        return self.name


class DPIA(BaseModel):
    """Data Protection Impact Assessment."""

    class DPIAStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        IN_REVIEW = "in_review", _("In Review")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    processing_activity = models.ForeignKey(
        ProcessingActivity, on_delete=models.CASCADE, related_name="dpias"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    assessor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dpias",
    )
    status = models.CharField(
        max_length=15, choices=DPIAStatus.choices, default=DPIAStatus.DRAFT
    )
    necessity_assessment = models.TextField(blank=True)
    proportionality_assessment = models.TextField(blank=True)
    risk_description = models.TextField(blank=True)
    mitigation_measures = models.TextField(blank=True)
    residual_risk_level = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("very_high", "Very High"),
        ],
        null=True,
        blank=True,
    )
    dpo_consultation_required = models.BooleanField(default=False)
    dpo_opinion = models.TextField(blank=True)
    approved_at = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = _("DPIA")
        verbose_name_plural = _("DPIAs")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class DataSubjectRequest(BaseModel):
    """GDPR Data Subject Request tracking."""

    class RequestType(models.TextChoices):
        ACCESS = "access", _("Right of Access")
        ERASURE = "erasure", _("Right to Erasure")
        PORTABILITY = "portability", _("Right to Data Portability")
        RECTIFICATION = "rectification", _("Right to Rectification")
        RESTRICTION = "restriction", _("Right to Restriction")
        OBJECTION = "objection", _("Right to Object")

    class DSRStatus(models.TextChoices):
        RECEIVED = "received", _("Received")
        VERIFIED = "verified", _("Identity Verified")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        DENIED = "denied", _("Denied")
        WITHDRAWN = "withdrawn", _("Withdrawn")

    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(
        max_length=15, choices=DSRStatus.choices, default=DSRStatus.RECEIVED
    )
    data_subject_name = models.CharField(max_length=200)
    data_subject_email = models.EmailField()
    description = models.TextField()
    handler = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dsr_handled",
    )
    received_at = models.DateTimeField()
    deadline = models.DateField()  # statutory 30-day deadline
    completed_at = models.DateTimeField(null=True, blank=True)
    response_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Data Subject Request")
        ordering = ["deadline"]

    def __str__(self):
        return f"{self.get_request_type_display()} – {self.data_subject_name}"
