"""
Goals Management — ISO 27001:2022 Clause 6.2 (Information Security Objectives)
and Clause 9.1 (Monitoring, Measurement, Analysis and Evaluation).
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class GoalCategory(BaseModel):
    """Classification for goals (e.g. Security, Compliance, Operational)."""

    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#3B82F6")

    class Meta:
        verbose_name = _("Goal Category")
        verbose_name_plural = _("Goal Categories")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Goal(BaseModel):
    """
    A measurable organizational or security goal aligned to ISO 27001:2022.
    Each goal has a quantifiable target and a periodic review/audit schedule.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        ACTIVE = "active", _("Active")
        ON_TRACK = "on_track", _("On Track")
        AT_RISK = "at_risk", _("At Risk")
        BEHIND = "behind", _("Behind Schedule")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    class ReviewFrequency(models.TextChoices):
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        BIANNUAL = "biannual", _("Bi-Annual")
        ANNUAL = "annual", _("Annual")
        AD_HOC = "ad_hoc", _("Ad Hoc")

    # Core fields
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    objective = models.TextField(
        blank=True,
        help_text="Specific outcome expected when this goal is achieved.",
    )

    # Measurable target (ISO 27001:2022 §6.2 requires SMART objectives)
    measurable_target = models.CharField(
        max_length=255,
        blank=True,
        help_text="Human-readable target, e.g. '99.9% uptime', '<2 critical vulnerabilities'",
    )
    unit = models.CharField(
        max_length=50,
        blank=True,
        help_text="Unit of measure, e.g. %, count, hours, days",
    )
    baseline_value = models.FloatField(null=True, blank=True)
    target_value = models.FloatField(null=True, blank=True)
    current_value = models.FloatField(null=True, blank=True)

    # Classification
    category = models.ForeignKey(
        GoalCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="goals",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_goals",
    )
    business_unit = models.ForeignKey(
        "organizations.BusinessUnit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="goals",
    )

    # Dates
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    # ISO 27001:2022 alignment
    iso27001_clause = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g. '6.2 Information security objectives', '9.1 Monitoring'",
    )

    # Review / audit schedule
    review_frequency = models.CharField(
        max_length=20,
        choices=ReviewFrequency.choices,
        default=ReviewFrequency.QUARTERLY,
    )
    next_review_date = models.DateField(null=True, blank=True)
    last_review_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Goal")
        verbose_name_plural = _("Goals")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def progress_pct(self):
        """Return percentage progress toward target, or None if not measurable."""
        if (
            self.baseline_value is None
            or self.target_value is None
            or self.current_value is None
        ):
            return None
        span = self.target_value - self.baseline_value
        if span == 0:
            return 100
        pct = ((self.current_value - self.baseline_value) / span) * 100
        return min(max(round(pct, 1), 0), 100)


class GoalReview(BaseModel):
    """
    Periodic review of a goal — implements the Maker/Checker (4-eyes) principle.
    Reviewer (Maker) records the review; Approver (Checker) validates it.
    Aligned to ISO 27001:2022 §9.1 and §9.3 (Management Review).
    """

    class WorkflowState(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SUBMITTED = "submitted", _("Submitted for Approval")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected — Needs Revision")

    class Outcome(models.TextChoices):
        ON_TRACK = "on_track", _("On Track")
        AT_RISK = "at_risk", _("At Risk")
        BEHIND = "behind", _("Behind Schedule")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="reviews")
    review_date = models.DateField()

    # Maker / Checker (4-eyes principle)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="goal_reviews_made",
        help_text="Maker — person conducting the review",
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="goal_reviews_approved",
        help_text="Checker — person approving the review",
    )

    workflow_state = models.CharField(
        max_length=20,
        choices=WorkflowState.choices,
        default=WorkflowState.DRAFT,
        db_index=True,
    )
    outcome = models.CharField(
        max_length=20,
        choices=Outcome.choices,
        default=Outcome.ON_TRACK,
    )

    # Review content
    current_value = models.FloatField(
        null=True, blank=True, help_text="Measured value at time of review"
    )
    findings = models.TextField(blank=True, help_text="Observations and evidence")
    recommendations = models.TextField(blank=True)
    actions_required = models.TextField(blank=True, help_text="Specific corrective actions")

    next_review_date = models.DateField(null=True, blank=True)

    # Approval audit trail
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Goal Review")
        verbose_name_plural = _("Goal Reviews")
        ordering = ["-review_date"]

    def __str__(self):
        return f"Review of '{self.goal.title}' on {self.review_date}"


class GoalAuditSchedule(BaseModel):
    """
    Configurable audit schedule for a goal.
    Supports periodic, triggered, or ad-hoc audit configurations.
    Aligned to ISO 27001:2022 §9.2 (Internal Audit).
    """

    class Frequency(models.TextChoices):
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        BIANNUAL = "biannual", _("Bi-Annual")
        ANNUAL = "annual", _("Annual")
        AD_HOC = "ad_hoc", _("Ad Hoc / On Demand")

    goal = models.OneToOneField(
        Goal, on_delete=models.CASCADE, related_name="audit_schedule"
    )
    frequency = models.CharField(
        max_length=20, choices=Frequency.choices, default=Frequency.QUARTERLY
    )
    assigned_auditor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_goal_audits",
    )
    next_audit_date = models.DateField(null=True, blank=True)
    last_audit_date = models.DateField(null=True, blank=True)
    audit_criteria = models.TextField(
        blank=True, help_text="Standards and criteria for the audit"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Goal Audit Schedule")

    def __str__(self):
        return f"Audit schedule for '{self.goal.title}' ({self.frequency})"
