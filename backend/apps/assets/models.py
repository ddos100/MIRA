"""
Asset management models: categories, assets, data assets, and data flows.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, Tag
from apps.organizations.models import BusinessUnit


class AssetCategory(BaseModel):
    """Category for grouping assets."""

    name = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True)
    color = models.CharField(
        max_length=7,
        default="#6B7280",
        help_text=_("Hex color code, e.g. #FF5733"),
    )

    class Meta:
        verbose_name = _("Asset Category")
        verbose_name_plural = _("Asset Categories")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Asset(BaseModel):
    """An organizational asset (system, application, hardware, data store,
    etc.)."""

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        RETIRED = "retired", _("Retired")

    class CIARating(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        AssetCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assets",
        verbose_name=_("Category"),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_assets",
        verbose_name=_("Owner"),
    )
    business_unit = models.ForeignKey(
        BusinessUnit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assets",
        verbose_name=_("Business Unit"),
    )
    criticality = models.PositiveSmallIntegerField(
        default=3,
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text=_("Criticality score from 1 (lowest) to 5 (highest)"),
        db_index=True,
    )
    asset_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Asset Value"),
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    # ── CIA Triad ratings ───────────────────────────────────────────────────
    confidentiality = models.CharField(
        max_length=10,
        choices=CIARating.choices,
        default=CIARating.MEDIUM,
        help_text=_("Confidentiality impact if this asset is compromised"),
        db_index=True,
    )
    integrity = models.CharField(
        max_length=10,
        choices=CIARating.choices,
        default=CIARating.MEDIUM,
        help_text=_("Integrity impact if this asset is tampered with"),
        db_index=True,
    )
    availability = models.CharField(
        max_length=10,
        choices=CIARating.choices,
        default=CIARating.MEDIUM,
        help_text=_("Availability impact if this asset is unavailable"),
        db_index=True,
    )

    notes = models.TextField(blank=True)
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="assets",
        verbose_name=_("Tags"),
    )

    class Meta:
        verbose_name = _("Asset")
        verbose_name_plural = _("Assets")
        ordering = ["name"]

    def __str__(self):
        return self.name


class DataAsset(BaseModel):
    """Additional data-specific attributes linked to an Asset via
    one-to-one."""

    class Classification(models.TextChoices):
        PUBLIC = "public", _("Public")
        INTERNAL = "internal", _("Internal")
        CONFIDENTIAL = "confidential", _("Confidential")
        RESTRICTED = "restricted", _("Restricted")

    asset = models.OneToOneField(
        Asset,
        on_delete=models.CASCADE,
        related_name="data_asset",
        verbose_name=_("Asset"),
    )
    classification = models.CharField(
        max_length=20,
        choices=Classification.choices,
        default=Classification.INTERNAL,
        db_index=True,
    )
    retention_period_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Retention Period (days)"),
    )
    processing_purpose = models.TextField(
        blank=True,
        verbose_name=_("Processing Purpose"),
    )
    legal_basis = models.TextField(
        blank=True,
        verbose_name=_("Legal Basis"),
    )

    class Meta:
        verbose_name = _("Data Asset")
        verbose_name_plural = _("Data Assets")
        ordering = ["-created_at"]

    def __str__(self):
        return f"DataAsset: {self.asset}"


class DataFlow(BaseModel):
    """Represents data movement between two assets."""

    class LifecycleStage(models.TextChoices):
        COLLECTION = "collection", _("Collection")
        PROCESSING = "processing", _("Processing")
        STORAGE = "storage", _("Storage")
        SHARING = "sharing", _("Sharing")
        ARCHIVAL = "archival", _("Archival")
        DELETION = "deletion", _("Deletion")

    name = models.CharField(max_length=255, db_index=True)
    source_asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="source_flows",
        verbose_name=_("Source Asset"),
    )
    destination_asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="dest_flows",
        verbose_name=_("Destination Asset"),
    )
    data_types = models.TextField(
        blank=True,
        verbose_name=_("Data Types"),
        help_text=_("Describe the types of data transferred"),
    )
    transfer_mechanism = models.TextField(
        blank=True,
        verbose_name=_("Transfer Mechanism"),
        help_text=_("Protocol or method used to transfer data"),
    )
    is_cross_border = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Is Cross-Border"),
    )
    notes = models.TextField(blank=True)

    # ── GDPR / Data lifecycle fields ───────────────────────────────────────
    legal_basis = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Legal Basis (GDPR Art. 6)"),
        help_text=_("e.g. Consent, Contract, Legal Obligation, Legitimate Interests"),
    )
    data_subject_categories = models.TextField(
        blank=True,
        verbose_name=_("Data Subject Categories"),
        help_text=_("Categories of individuals whose data is processed"),
    )
    personal_data_categories = models.TextField(
        blank=True,
        verbose_name=_("Personal Data Categories"),
        help_text=_("Types of personal data in this flow"),
    )
    special_category_data = models.BooleanField(
        default=False,
        verbose_name=_("Contains Special Category Data (Art. 9)"),
    )
    retention_period_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Retention Period (days)"),
    )
    transfer_safeguards = models.TextField(
        blank=True,
        verbose_name=_("Transfer Safeguards"),
        help_text=_("Standard Contractual Clauses, Adequacy Decision, BCR, etc."),
    )
    lifecycle_stage = models.CharField(
        max_length=20,
        choices=LifecycleStage.choices,
        blank=True,
        db_index=True,
        verbose_name=_("Lifecycle Stage"),
    )
    processing_activity = models.ForeignKey(
        "privacy.ProcessingActivity",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="data_flows",
        verbose_name=_("RoPA Processing Activity"),
    )

    class Meta:
        verbose_name = _("Data Flow")
        verbose_name_plural = _("Data Flows")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}: {self.source_asset} → {self.destination_asset}"


# ─── Lifecycle Stage requirements template ────────────────────────────────────

STAGE_REQUIREMENTS_TEMPLATE = {
    "collection": [
        {"framework": "gdpr", "key": "legal_basis",        "label": "Legal basis documented",         "reference": "Art. 6"},
        {"framework": "gdpr", "key": "privacy_notice",     "label": "Privacy notice provided",        "reference": "Art. 13/14"},
        {"framework": "gdpr", "key": "data_minimization",  "label": "Data minimization applied",      "reference": "Art. 5(1)(c)"},
        {"framework": "gdpr", "key": "consent_mechanism",  "label": "Consent mechanism in place",     "reference": "Art. 7"},
        {"framework": "dpdpa", "key": "notice_principal",  "label": "Notice given to Data Principal", "reference": "S.5"},
        {"framework": "dpdpa", "key": "consent_obtained",  "label": "Consent / Legitimate use basis", "reference": "S.6/S.7"},
        {"framework": "dpdpa", "key": "purpose_specified", "label": "Processing purpose clearly specified", "reference": "S.5"},
        {"framework": "dpdpa", "key": "rights_communicated", "label": "Data Principal rights communicated", "reference": "S.11/S.12"},
    ],
    "processing": [
        {"framework": "gdpr", "key": "purpose_limitation", "label": "Processing matches declared purpose", "reference": "Art. 5(1)(b)"},
        {"framework": "gdpr", "key": "accuracy",           "label": "Data accuracy maintained",        "reference": "Art. 5(1)(d)"},
        {"framework": "gdpr", "key": "processor_agreement","label": "Data processor agreement in place","reference": "Art. 28"},
        {"framework": "gdpr", "key": "security_measures",  "label": "Appropriate security measures",   "reference": "Art. 32"},
        {"framework": "dpdpa", "key": "lawful_purpose",    "label": "Processing limited to lawful purpose", "reference": "S.4"},
        {"framework": "dpdpa", "key": "fiduciary_obligations", "label": "Data Fiduciary obligations fulfilled", "reference": "S.8"},
        {"framework": "dpdpa", "key": "data_accuracy",     "label": "Data accuracy and integrity maintained", "reference": "S.8(3)"},
    ],
    "storage": [
        {"framework": "gdpr", "key": "retention_defined",  "label": "Retention period defined and documented", "reference": "Art. 5(1)(e)"},
        {"framework": "gdpr", "key": "storage_security",   "label": "Storage security controls in place",     "reference": "Art. 32"},
        {"framework": "gdpr", "key": "access_controls",    "label": "Access controls limiting data access",   "reference": "Art. 32"},
        {"framework": "dpdpa", "key": "erasure_on_purpose","label": "Erasure on purpose fulfillment",         "reference": "S.8(7)"},
        {"framework": "dpdpa", "key": "erasure_on_withdrawal", "label": "Erasure on consent withdrawal",      "reference": "S.8(7)"},
        {"framework": "dpdpa", "key": "security_safeguards","label": "Reasonable security safeguards in place","reference": "S.8(5)"},
    ],
    "sharing": [
        {"framework": "gdpr", "key": "third_party_contracts", "label": "Third-party data processing agreements", "reference": "Art. 28"},
        {"framework": "gdpr", "key": "cross_border_safeguards","label": "Cross-border transfer safeguards",     "reference": "Art. 46/49"},
        {"framework": "gdpr", "key": "sharing_agreement",  "label": "Data sharing agreement documented",      "reference": "Art. 26/28"},
        {"framework": "dpdpa", "key": "processor_agreement","label": "Data Processor agreement executed",     "reference": "S.9"},
        {"framework": "dpdpa", "key": "significant_fiduciary","label": "Significant Data Fiduciary obligations","reference": "S.10"},
        {"framework": "dpdpa", "key": "cross_border_dpdpa","label": "Cross-border transfer permitted",        "reference": "S.16"},
    ],
    "archival": [
        {"framework": "gdpr", "key": "archival_purpose",   "label": "Archival purpose documented",            "reference": "Art. 89"},
        {"framework": "gdpr", "key": "restricted_access",  "label": "Access to archived data restricted",    "reference": "Art. 32"},
        {"framework": "gdpr", "key": "encryption",         "label": "Archived data encrypted",               "reference": "Art. 32"},
        {"framework": "dpdpa", "key": "retention_justified","label": "Retention beyond purpose justified",    "reference": "S.8(7)"},
        {"framework": "dpdpa", "key": "periodic_review",   "label": "Periodic review of archived data",      "reference": "S.8"},
    ],
    "deletion": [
        {"framework": "gdpr", "key": "secure_disposal",    "label": "Secure data disposal method used",      "reference": "Art. 5(1)(e)"},
        {"framework": "gdpr", "key": "erasure_right",      "label": "Right to erasure honored",              "reference": "Art. 17"},
        {"framework": "gdpr", "key": "deletion_audit",     "label": "Deletion audit trail maintained",       "reference": "Art. 5(2)"},
        {"framework": "dpdpa", "key": "erasure_confirmation","label": "Erasure confirmation to Data Principal","reference": "S.12"},
        {"framework": "dpdpa", "key": "third_party_erasure","label": "Third-party erasure verified",         "reference": "S.12"},
        {"framework": "dpdpa", "key": "grievance_redressal","label": "Grievance redressal mechanism active", "reference": "S.8(6)"},
    ],
}


class DataLifecycleStage(BaseModel):
    """
    Per-stage compliance record for a DataFlow.
    One record per lifecycle stage per flow (unique_together).
    """

    class ComplianceStatus(models.TextChoices):
        PENDING  = "pending",  _("Pending Review")
        MET      = "met",      _("Met")
        PARTIAL  = "partial",  _("Partially Met")
        NOT_MET  = "not_met",  _("Not Met")
        NA       = "na",       _("Not Applicable")

    data_flow = models.ForeignKey(
        DataFlow,
        on_delete=models.CASCADE,
        related_name="lifecycle_stages",
        verbose_name=_("Data Flow"),
    )
    stage = models.CharField(
        max_length=20,
        choices=DataFlow.LifecycleStage.choices,
        db_index=True,
        verbose_name=_("Lifecycle Stage"),
    )
    processing_activity = models.ForeignKey(
        "privacy.ProcessingActivity",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="lifecycle_stages",
        verbose_name=_("RoPA Processing Activity"),
    )

    # Stage-specific detail fields
    purpose                  = models.TextField(blank=True, verbose_name=_("Processing Purpose"))
    legal_basis_gdpr         = models.CharField(max_length=120, blank=True, verbose_name=_("Legal Basis (GDPR Art. 6)"))
    legal_basis_dpdpa        = models.CharField(max_length=120, blank=True, verbose_name=_("Legal Basis (DPDPA S.6/S.7)"))
    data_subject_categories  = models.TextField(blank=True, verbose_name=_("Data Subject Categories"))
    personal_data_categories = models.TextField(blank=True, verbose_name=_("Personal Data Categories"))
    special_category_data    = models.BooleanField(default=False, verbose_name=_("Special Category Data (Art. 9 / S.9)"))
    retention_period_days    = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Retention Period (days)"))
    retention_justification  = models.TextField(blank=True, verbose_name=_("Retention Justification"))
    security_measures        = models.TextField(blank=True, verbose_name=_("Security Measures"))
    third_party_name         = models.CharField(max_length=255, blank=True, verbose_name=_("Third Party / Recipient"))
    third_party_agreement    = models.BooleanField(default=False, verbose_name=_("Third-Party Agreement in Place"))
    transfer_safeguards      = models.TextField(blank=True, verbose_name=_("Transfer Safeguards"))
    is_cross_border          = models.BooleanField(default=False, verbose_name=_("Cross-Border Transfer"))
    deletion_method          = models.TextField(blank=True, verbose_name=_("Deletion / Disposal Method"))
    notes                    = models.TextField(blank=True, verbose_name=_("Stage Notes"))

    # Overall compliance for this stage
    compliance_status = models.CharField(
        max_length=10,
        choices=ComplianceStatus.choices,
        default=ComplianceStatus.PENDING,
        db_index=True,
        verbose_name=_("Overall Compliance Status"),
    )
    compliance_notes = models.TextField(blank=True, verbose_name=_("Compliance Notes"))
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_lifecycle_stages",
        verbose_name=_("Stage Owner"),
    )

    class Meta:
        verbose_name = _("Data Lifecycle Stage")
        verbose_name_plural = _("Data Lifecycle Stages")
        unique_together = [["data_flow", "stage"]]
        ordering = ["stage"]

    def __str__(self):
        return f"{self.data_flow.name} – {self.get_stage_display()}"

    def recompute_compliance_status(self):
        """Set overall status based on requirement ratings."""
        ratings = list(self.requirements.values_list("rating", flat=True))
        if not ratings:
            self.compliance_status = self.ComplianceStatus.PENDING
        elif all(r in ("met", "na") for r in ratings):
            self.compliance_status = self.ComplianceStatus.MET
        elif any(r == "not_met" for r in ratings):
            self.compliance_status = self.ComplianceStatus.NOT_MET
        elif any(r == "partial" for r in ratings):
            self.compliance_status = self.ComplianceStatus.PARTIAL
        else:
            self.compliance_status = self.ComplianceStatus.PENDING
        self.save(update_fields=["compliance_status", "updated_at"])


class DataLifecycleRequirement(models.Model):
    """
    Individual GDPR / DPDPA compliance checklist item for a lifecycle stage.
    Pre-populated from STAGE_REQUIREMENTS_TEMPLATE when the stage is created.

    Maker-Checker workflow
    ----------------------
    approval_status: draft → pending_approval → approved | rejected
      * Makers edit rating/notes while status is 'draft' or 'rejected'.
      * Submitting for approval locks editing and sets status to 'pending_approval'.
      * Checkers approve (→ 'approved') or reject (→ 'rejected', resumes editing).
    """

    class Rating(models.TextChoices):
        PENDING  = "pending",  _("Pending")
        MET      = "met",      _("Met")
        PARTIAL  = "partial",  _("Partially Met")
        NOT_MET  = "not_met",  _("Not Met")
        NA       = "na",       _("Not Applicable")

    class Framework(models.TextChoices):
        GDPR  = "gdpr",  _("GDPR")
        DPDPA = "dpdpa", _("DPDPA (India)")

    class ApprovalStatus(models.TextChoices):
        DRAFT            = "draft",            _("Draft")
        PENDING_APPROVAL = "pending_approval", _("Pending Approval")
        APPROVED         = "approved",         _("Approved")
        REJECTED         = "rejected",         _("Rejected")

    stage_record      = models.ForeignKey(
        DataLifecycleStage,
        on_delete=models.CASCADE,
        related_name="requirements",
        verbose_name=_("Stage Record"),
    )
    framework         = models.CharField(max_length=10, choices=Framework.choices, db_index=True)
    requirement_key   = models.CharField(max_length=100)
    requirement_label = models.CharField(max_length=255)
    article_reference = models.CharField(max_length=60, blank=True)
    rating            = models.CharField(
        max_length=10,
        choices=Rating.choices,
        default=Rating.PENDING,
        db_index=True,
    )
    notes             = models.TextField(blank=True)
    privacy_risk      = models.ForeignKey(
        "risks.Risk",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="lifecycle_requirements",
        verbose_name=_("Auto-Created Privacy Risk"),
    )

    # ── Maker-Checker fields ──────────────────────────────────────────────────
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.DRAFT,
        db_index=True,
        verbose_name=_("Approval Status"),
    )
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="made_requirements",
        verbose_name=_("Submitted By"),
    )
    checker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="checked_requirements",
        verbose_name=_("Reviewed By"),
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Submitted At"))
    approved_at  = models.DateTimeField(null=True, blank=True, verbose_name=_("Approved At"))
    checker_notes = models.TextField(blank=True, verbose_name=_("Checker Notes"))

    class Meta:
        verbose_name = _("Lifecycle Compliance Requirement")
        verbose_name_plural = _("Lifecycle Compliance Requirements")
        unique_together = [["stage_record", "requirement_key"]]
        ordering = ["framework", "requirement_key"]

    def __str__(self):
        return f"{self.stage_record} / {self.requirement_label} [{self.rating}]"

    @property
    def is_editable(self):
        """Makers may only edit draft or rejected requirements."""
        return self.approval_status in (
            self.ApprovalStatus.DRAFT,
            self.ApprovalStatus.REJECTED,
        )


class RequirementAuditLog(models.Model):
    """
    Immutable audit trail for DataLifecycleRequirement changes.
    One row per significant action (rated, submitted, approved, rejected).
    """

    class Action(models.TextChoices):
        RATED     = "rated",     _("Rated")
        SUBMITTED = "submitted", _("Submitted for Approval")
        APPROVED  = "approved",  _("Approved")
        REJECTED  = "rejected",  _("Rejected")

    requirement = models.ForeignKey(
        DataLifecycleRequirement,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        verbose_name=_("Requirement"),
    )
    action      = models.CharField(max_length=20, choices=Action.choices)
    from_rating = models.CharField(max_length=20, blank=True, verbose_name=_("Previous Rating"))
    to_rating   = models.CharField(max_length=20, blank=True, verbose_name=_("New Rating"))
    notes       = models.TextField(blank=True, verbose_name=_("Notes / Reason"))
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="requirement_audit_logs",
        verbose_name=_("Actor"),
    )
    timestamp   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Requirement Audit Log")
        verbose_name_plural = _("Requirement Audit Logs")
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.requirement} – {self.action} @ {self.timestamp:%Y-%m-%d %H:%M}"
