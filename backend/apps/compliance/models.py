"""Compliance Management models."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class ComplianceFrameworkTemplate(BaseModel):
    """
    Predefined framework templates (ISO 27001, NIST CSF, SOC 2, HIPAA, etc.).
    Admins can instantiate a full ComplianceFramework + Requirement tree from
    one of these templates via the API action /compliance/framework-templates/{id}/instantiate/.
    """

    class TemplateType(models.TextChoices):
        ISO_27001 = "iso_27001", _("ISO/IEC 27001:2022")
        NIST_CSF = "nist_csf", _("NIST Cybersecurity Framework")
        NIST_800_53 = "nist_800_53", _("NIST SP 800-53")
        SOC2 = "soc2", _("SOC 2 (Trust Services Criteria)")
        HIPAA = "hipaa", _("HIPAA Security Rule")
        GDPR = "gdpr", _("GDPR")
        PCI_DSS = "pci_dss", _("PCI DSS v4.0")
        ISO_31000 = "iso_31000", _("ISO 31000 Risk Management")
        ISO_22301 = "iso_22301", _("ISO 22301 Business Continuity")
        CUSTOM = "custom", _("Custom Template")

    name = models.CharField(max_length=200)
    template_type = models.CharField(
        max_length=30, choices=TemplateType.choices, unique=True
    )
    short_name = models.CharField(max_length=50)
    version = models.CharField(max_length=50, blank=True)
    issuing_body = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    # JSON structure: list of {ref_code, title, description, guidance, order, children:[...]}
    structure = models.JSONField(
        default=list, help_text="Hierarchical requirement structure"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Compliance Framework Template")
        verbose_name_plural = _("Compliance Framework Templates")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.version})"


class ComplianceFramework(BaseModel):
    name = models.CharField(max_length=200, unique=True)
    short_name = models.CharField(max_length=50, unique=True)
    version = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    issuing_body = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Compliance Framework")
        ordering = ["name"]

    def __str__(self):
        return f"{self.short_name} {self.version}"


class Requirement(BaseModel):
    framework = models.ForeignKey(
        ComplianceFramework, on_delete=models.CASCADE, related_name="requirements"
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    ref_code = models.CharField(max_length=50)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    guidance = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Requirement")
        ordering = ["framework", "order", "ref_code"]
        unique_together = [("framework", "ref_code")]

    def __str__(self):
        return f"{self.framework.short_name} {self.ref_code}: {self.title}"


class RequirementMapping(BaseModel):
    """
    Maps equivalent or related requirements across different frameworks.
    Enables cross-framework gap analysis and common-control identification.
    """

    class Relationship(models.TextChoices):
        EQUIVALENT = "equivalent", _("Equivalent")
        SUBSET = "subset", _("Subset of")
        SUPERSET = "superset", _("Superset of")
        RELATED = "related", _("Related")

    source = models.ForeignKey(
        Requirement,
        on_delete=models.CASCADE,
        related_name="mappings_as_source",
        help_text="The originating requirement",
    )
    target = models.ForeignKey(
        Requirement,
        on_delete=models.CASCADE,
        related_name="mappings_as_target",
        help_text="The mapped-to requirement in another framework",
    )
    relationship = models.CharField(
        max_length=20,
        choices=Relationship.choices,
        default=Relationship.RELATED,
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Requirement Mapping")
        verbose_name_plural = _("Requirement Mappings")
        unique_together = [("source", "target")]
        ordering = ["source__ref_code"]

    def __str__(self):
        return f"{self.source} → {self.target} ({self.get_relationship_display()})"


class ComplianceProgram(BaseModel):
    class Status(models.TextChoices):
        PLANNED = "planned", _("Planned")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        SUSPENDED = "suspended", _("Suspended")

    name = models.CharField(max_length=255)
    framework = models.ForeignKey(
        ComplianceFramework, on_delete=models.CASCADE, related_name="programs"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="compliance_programs",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNED
    )
    target_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Compliance Program")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ComplianceAssessment(BaseModel):
    class ComplianceStatus(models.TextChoices):
        NOT_ASSESSED = "not_assessed", _("Not Assessed")
        COMPLIANT = "compliant", _("Compliant")
        PARTIALLY_COMPLIANT = "partially_compliant", _("Partially Compliant")
        NON_COMPLIANT = "non_compliant", _("Non-Compliant")
        NOT_APPLICABLE = "not_applicable", _("Not Applicable")

    program = models.ForeignKey(
        ComplianceProgram, on_delete=models.CASCADE, related_name="assessments"
    )
    requirement = models.ForeignKey(
        Requirement, on_delete=models.CASCADE, related_name="assessments"
    )
    status = models.CharField(
        max_length=25,
        choices=ComplianceStatus.choices,
        default=ComplianceStatus.NOT_ASSESSED,
    )
    notes = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_compliance_assessments",
        help_text=_("Person responsible for meeting this requirement"),
    )
    assessor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="compliance_assessments",
    )
    assessment_date = models.DateField(null=True, blank=True)
    next_review_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = _("Compliance Assessment")
        unique_together = [("program", "requirement")]
        ordering = ["requirement__order"]

    def __str__(self):
        return f"{self.program} \u2013 {self.requirement.ref_code}: {self.get_status_display()}"


class Evidence(BaseModel):
    assessment = models.ForeignKey(
        ComplianceAssessment, on_delete=models.CASCADE, related_name="evidence"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="evidence/%Y/%m/", null=True, blank=True)
    url = models.URLField(blank=True)
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="collected_evidence",
    )
    collected_date = models.DateField(null=True, blank=True)
    valid_until = models.DateField(
        null=True,
        blank=True,
        help_text=_("Evidence freshness — auditor-usable until this date."),
    )

    class Meta:
        verbose_name = _("Evidence")
        verbose_name_plural = _("Evidence")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def is_expired(self) -> bool:
        if not self.valid_until:
            return False
        from django.utils import timezone
        return timezone.now().date() > self.valid_until
