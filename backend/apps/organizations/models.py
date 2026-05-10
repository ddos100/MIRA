"""
Organization structure models: Business Units and Business Processes.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from mptt.models import MPTTModel, TreeForeignKey

from apps.core.models import BaseModel


class BusinessUnit(MPTTModel, BaseModel):
    """Hierarchical business unit / department using MPTT."""

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    parent = TreeForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        verbose_name=_("Parent Unit"),
    )
    organization_head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_business_units",
        verbose_name=_("Organization Head"),
    )
    code = models.CharField(max_length=50, unique=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class MPTTMeta:
        order_insertion_by = ["name"]

    class Meta:
        verbose_name = _("Business Unit")
        verbose_name_plural = _("Business Units")
        ordering = ["name"]

    def __str__(self):
        return self.name


class BusinessProcess(BaseModel):
    """A business process owned by a business unit."""

    class Criticality(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.CASCADE,
        related_name="processes",
        verbose_name=_("Business Unit"),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_business_processes",
        verbose_name=_("Owner"),
    )
    criticality = models.CharField(
        max_length=20,
        choices=Criticality.choices,
        default=Criticality.MEDIUM,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = _("Business Process")
        verbose_name_plural = _("Business Processes")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.business_unit})"


class OrgSettings(models.Model):
    """
    Singleton model storing organization-wide settings.
    There should only ever be one row (pk=1).
    """

    org_name = models.CharField(max_length=255, default="MIRA GRC")
    description = models.TextField(blank=True)
    timezone = models.CharField(max_length=100, default="UTC")
    primary_contact_email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="org/logos/", null=True, blank=True)
    max_risk_score = models.PositiveSmallIntegerField(
        default=25,
        help_text="Maximum possible risk score (likelihood × impact). Used for heatmap scaling.",
    )
    risk_review_days = models.PositiveSmallIntegerField(
        default=90,
        help_text="Default number of days before a risk review is due.",
    )
    policy_review_days = models.PositiveSmallIntegerField(
        default=365,
        help_text="Default number of days before a policy review is due.",
    )
    enable_2fa_required = models.BooleanField(
        default=False,
        help_text="Require all users to enrol in two-factor authentication.",
    )

    class Meta:
        verbose_name = _("Organisation Settings")
        verbose_name_plural = _("Organisation Settings")

    def __str__(self):
        return self.org_name

    @classmethod
    def get(cls) -> "OrgSettings":
        """Return the singleton OrgSettings row, creating it if absent."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Scope(BaseModel):
    """
    Versioned ISMS/GRC Scope document (ISO 27001 §4.3).
    Supports a Maker/Checker approval workflow and configurable review periodicity.
    Each approval is recorded in ScopeApprovalHistory; a new review date is
    automatically computed from review_periodicity_days on each approval.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        APPROVED = "approved", _("Approved")
        SUPERSEDED = "superseded", _("Superseded")

    class WorkflowState(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SUBMITTED = "submitted", _("Submitted for Approval")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    # Review periodicity options (days)
    PERIODICITY_CHOICES = [
        (30,  _("Monthly (30 days)")),
        (60,  _("Bi-Monthly (60 days)")),
        (90,  _("Quarterly (90 days)")),
        (180, _("Semi-Annual (180 days)")),
        (365, _("Annual (365 days)")),
        (730, _("Bi-Annual (730 days)")),
    ]

    title = models.CharField(max_length=255, default="ISMS Scope")
    content = models.TextField(blank=True, help_text="Scope document content (Markdown supported)")
    version = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    workflow_state = models.CharField(
        max_length=20, choices=WorkflowState.choices, default=WorkflowState.DRAFT, db_index=True
    )
    effective_date = models.DateField(null=True, blank=True)
    review_periodicity_days = models.PositiveIntegerField(
        default=365,
        choices=PERIODICITY_CHOICES,
        help_text="How many days between reviews (mandatory)",
    )
    next_review_date = models.DateField(
        null=True, blank=True,
        help_text="Auto-computed on approval; must be set for every review cycle",
    )

    # Maker — the person who prepares and submits the scope document
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="scope_maker_docs",
        verbose_name=_("Maker (Reviewer)"),
    )
    # Checker — the person who approves or rejects the scope document
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="scope_checker_docs",
        verbose_name=_("Checker (Approver)"),
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Scope")
        verbose_name_plural = _("Scopes")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} v{self.version} ({self.get_status_display()})"

    def submit_for_approval(self, user):
        self.workflow_state = self.WorkflowState.SUBMITTED
        self.submitted_at = timezone.now()
        self.reviewer = user
        self.save(update_fields=["workflow_state", "submitted_at", "reviewer", "updated_at"])

    def approve(self, user):
        from datetime import timedelta
        now = timezone.now()
        self.workflow_state = self.WorkflowState.APPROVED
        self.status = self.Status.APPROVED
        self.approver = user
        self.approved_at = now
        # Auto-compute next review date from approval date
        self.next_review_date = (now + timedelta(days=self.review_periodicity_days)).date()
        self.save(update_fields=[
            "workflow_state", "status", "approver", "approved_at",
            "next_review_date", "updated_at",
        ])
        # Record approval history
        ScopeApprovalHistory.objects.create(
            scope=self,
            approved_by=user,
            version=self.version,
            next_review_date=self.next_review_date,
        )

    def reject(self, user, reason=""):
        self.workflow_state = self.WorkflowState.REJECTED
        self.rejection_reason = reason
        self.save(update_fields=["workflow_state", "rejection_reason", "updated_at"])


class ScopeApprovalHistory(models.Model):
    """
    Immutable record of each Scope approval event.
    Created automatically by Scope.approve().
    """

    scope = models.ForeignKey(
        Scope,
        on_delete=models.CASCADE,
        related_name="approval_history",
        verbose_name=_("Scope"),
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="scope_approval_history",
        verbose_name=_("Approved By"),
    )
    version = models.CharField(max_length=20)
    approved_at = models.DateTimeField(auto_now_add=True)
    next_review_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Scope Approval Record")
        verbose_name_plural = _("Scope Approval Records")
        ordering = ["-approved_at"]

    def __str__(self):
        return f"{self.scope} — approved by {self.approved_by} at {self.approved_at:%Y-%m-%d}"


class OrganizationalIssue(BaseModel):
    """
    Internal and External Issues — Risks and Opportunities (ISO 27001 §4.1 / §4.2).
    """

    class IssueType(models.TextChoices):
        INTERNAL = "internal", _("Internal")
        EXTERNAL = "external", _("External")

    class Category(models.TextChoices):
        RISK = "risk", _("Risk")
        OPPORTUNITY = "opportunity", _("Opportunity")
        CONSTRAINT = "constraint", _("Constraint")
        TREND = "trend", _("Trend")

    class ImpactLevel(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        RESOLVED = "resolved", _("Resolved")
        ACCEPTED = "accepted", _("Accepted")

    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    issue_type = models.CharField(
        max_length=20, choices=IssueType.choices, default=IssueType.INTERNAL, db_index=True
    )
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.RISK, db_index=True
    )
    impact_level = models.CharField(
        max_length=20, choices=ImpactLevel.choices, default=ImpactLevel.MEDIUM, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_org_issues",
        verbose_name=_("Owner"),
    )
    due_date = models.DateField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    linked_risks = models.ManyToManyField(
        "risks.Risk",
        blank=True,
        related_name="org_issues",
        verbose_name=_("Linked Risks"),
    )

    class Meta:
        verbose_name = _("Organizational Issue")
        verbose_name_plural = _("Organizational Issues")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_issue_type_display()} / {self.get_category_display()})"


class RiskOpportunity(BaseModel):
    """
    Organizational-level Risks and Opportunities — ISO 27001:2022 §6.1.
    Distinct from operational risks (apps.risks.Risk); these are strategic
    considerations arising from the context of the organization (§4.1/§4.2).
    """

    class ItemType(models.TextChoices):
        RISK = "risk", _("Risk")
        OPPORTUNITY = "opportunity", _("Opportunity")

    class Likelihood(models.IntegerChoices):
        RARE = 1, _("1 – Rare")
        UNLIKELY = 2, _("2 – Unlikely")
        POSSIBLE = 3, _("3 – Possible")
        LIKELY = 4, _("4 – Likely")
        ALMOST_CERTAIN = 5, _("5 – Almost Certain")

    class Impact(models.IntegerChoices):
        NEGLIGIBLE = 1, _("1 – Negligible")
        MINOR = 2, _("2 – Minor")
        MODERATE = 3, _("3 – Moderate")
        MAJOR = 4, _("4 – Major")
        CATASTROPHIC = 5, _("5 – Catastrophic")

    class Treatment(models.TextChoices):
        ACCEPT = "accept", _("Accept")
        MITIGATE = "mitigate", _("Mitigate")
        TRANSFER = "transfer", _("Transfer")
        AVOID = "avoid", _("Avoid")
        EXPLOIT = "exploit", _("Exploit (Opportunity)")
        SHARE = "share", _("Share (Opportunity)")
        ENHANCE = "enhance", _("Enhance (Opportunity)")

    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        IN_TREATMENT = "in_treatment", _("In Treatment")
        MONITORED = "monitored", _("Monitored")
        CLOSED = "closed", _("Closed")

    class ResidualLevel(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    item_type = models.CharField(
        max_length=20, choices=ItemType.choices, default=ItemType.RISK, db_index=True
    )

    # Context linkage (ISO §4.1/4.2 → §6.1)
    linked_issue = models.ForeignKey(
        OrganizationalIssue,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="risk_opportunities",
        verbose_name=_("Source Issue (§4.1/§4.2)"),
    )

    likelihood = models.PositiveSmallIntegerField(
        choices=Likelihood.choices, default=Likelihood.POSSIBLE
    )
    impact = models.PositiveSmallIntegerField(
        choices=Impact.choices, default=Impact.MODERATE
    )

    @property
    def risk_score(self) -> int:
        return self.likelihood * self.impact

    treatment = models.CharField(
        max_length=20, choices=Treatment.choices, default=Treatment.MITIGATE, db_index=True
    )
    treatment_plan = models.TextField(blank=True, help_text="Actions to address this risk/opportunity")

    residual_level = models.CharField(
        max_length=20, choices=ResidualLevel.choices, blank=True, db_index=True,
        verbose_name=_("Residual Level after Treatment"),
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_risk_opportunities",
        verbose_name=_("Owner"),
    )
    due_date = models.DateField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Risk / Opportunity")
        verbose_name_plural = _("Risks & Opportunities")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_item_type_display()}: {self.title} (score {self.risk_score})"
