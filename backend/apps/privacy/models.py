from django.conf import settings
from django.db import models
from django.utils import timezone
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
    security_measures = models.TextField(
        blank=True,
        verbose_name=_("Technical & Organisational Security Measures"),
        help_text=_("Art. 30(1)(g) – describe the TOM applied to this processing activity"),
    )
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
    dpo_consulted_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("DPO Consultation Date"),
        help_text=_("Art. 36 – date the DPO was formally consulted"),
    )
    dpo_opinion = models.TextField(blank=True)
    approved_at = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    privacy_risks = models.ManyToManyField(
        "risks.Risk",
        related_name="dpias",
        blank=True,
        verbose_name=_("Privacy Risks"),
    )

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

    @property
    def is_overdue(self) -> bool:
        """True when the statutory deadline has passed and the request is still open."""
        terminal = {self.DSRStatus.COMPLETED, self.DSRStatus.DENIED, self.DSRStatus.WITHDRAWN}
        if self.status in terminal:
            return False
        return timezone.now().date() > self.deadline

    def __str__(self):
        return f"{self.get_request_type_display()} – {self.data_subject_name}"


class ConsentRecord(BaseModel):
    """
    GDPR Article 7 / DPDPA Sec. 6 — granular consent capture with full audit trail
    of grant, withdrawal, and renewal events. Supports purpose-based consent
    aligned to ProcessingActivity records.
    """

    class Channel(models.TextChoices):
        WEB_FORM = "web_form", _("Web Form")
        EMAIL = "email", _("Email")
        IN_PERSON = "in_person", _("In Person")
        PAPER = "paper", _("Paper / Signed Form")
        API = "api", _("API / Programmatic")
        PHONE = "phone", _("Phone")
        OTHER = "other", _("Other")

    class ConsentStatus(models.TextChoices):
        GRANTED = "granted", _("Granted")
        WITHDRAWN = "withdrawn", _("Withdrawn")
        EXPIRED = "expired", _("Expired")
        PENDING = "pending", _("Pending")

    # Subject identification (no FK to User — covers external data subjects)
    data_subject_identifier = models.CharField(
        max_length=255,
        db_index=True,
        help_text=_("Email, customer ID, or other stable subject identifier."),
    )
    data_subject_name = models.CharField(max_length=200, blank=True)

    purpose = models.CharField(
        max_length=255,
        help_text=_("Specific, explicit purpose for which consent is given."),
    )
    processing_activity = models.ForeignKey(
        ProcessingActivity,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="consents",
    )

    legal_basis_text = models.TextField(
        blank=True,
        help_text=_("The wording the data subject saw at consent time (Art. 7(2) clarity)."),
    )
    consent_version = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Version of the consent notice / privacy notice presented."),
    )
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.WEB_FORM
    )
    status = models.CharField(
        max_length=15,
        choices=ConsentStatus.choices,
        default=ConsentStatus.GRANTED,
        db_index=True,
    )

    granted_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdrawal_reason = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Provenance for audit (where the click / signature happened)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    evidence_ref = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Reference to signed document, log entry, or screenshot."),
    )

    class Meta:
        verbose_name = _("Consent Record")
        verbose_name_plural = _("Consent Records")
        ordering = ["-granted_at", "-created_at"]
        indexes = [
            models.Index(fields=["data_subject_identifier", "status"]),
            models.Index(fields=["processing_activity", "status"]),
        ]

    def __str__(self):
        return f"{self.data_subject_identifier} → {self.purpose} [{self.status}]"

    @property
    def is_active(self) -> bool:
        if self.status != self.ConsentStatus.GRANTED:
            return False
        if self.expires_at and timezone.now() >= self.expires_at:
            return False
        return True


class ConsentEvent(BaseModel):
    """Append-only event log for a ConsentRecord (grant, withdraw, renew, expire)."""

    class EventType(models.TextChoices):
        GRANTED = "granted", _("Granted")
        WITHDRAWN = "withdrawn", _("Withdrawn")
        RENEWED = "renewed", _("Renewed")
        EXPIRED = "expired", _("Expired")
        UPDATED = "updated", _("Updated")

    consent = models.ForeignKey(
        ConsentRecord, on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=15, choices=EventType.choices)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    actor = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Who performed the action (subject email, admin user, system)."),
    )
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = _("Consent Event")
        ordering = ["-occurred_at"]
        indexes = [models.Index(fields=["consent", "event_type"])]

    def __str__(self):
        return f"{self.consent_id} [{self.event_type}] @ {self.occurred_at}"
