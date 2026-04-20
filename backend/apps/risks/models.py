"""Risk Management models."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class RiskCategory(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#EF4444")

    class Meta:
        verbose_name = _("Risk Category")
        verbose_name_plural = _("Risk Categories")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Risk(BaseModel):
    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        IN_TREATMENT = "in_treatment", _("In Treatment")
        ACCEPTED = "accepted", _("Accepted")
        CLOSED = "closed", _("Closed")
        TRANSFERRED = "transferred", _("Transferred")

    class TreatmentType(models.TextChoices):
        MITIGATE = "mitigate", _("Mitigate")
        AVOID = "avoid", _("Avoid")
        TRANSFER = "transfer", _("Transfer")
        ACCEPT = "accept", _("Accept")

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(
        RiskCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risks",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_risks",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    treatment_type = models.CharField(
        max_length=20,
        choices=TreatmentType.choices,
        null=True,
        blank=True,
    )

    # Inherent scoring
    inherent_likelihood = models.PositiveSmallIntegerField(default=3)  # 1-5
    inherent_impact = models.PositiveSmallIntegerField(default=3)  # 1-5
    inherent_score = models.PositiveSmallIntegerField(default=9, editable=False)

    # Residual scoring (after controls)
    residual_likelihood = models.PositiveSmallIntegerField(default=3)
    residual_impact = models.PositiveSmallIntegerField(default=3)
    residual_score = models.PositiveSmallIntegerField(default=9, editable=False)

    # Relationships
    assets = models.ManyToManyField("assets.Asset", blank=True, related_name="risks")
    threats = models.ManyToManyField("threats.Threat", blank=True, related_name="risks")
    vulnerabilities = models.ManyToManyField("threats.Vulnerability", blank=True, related_name="risks")
    third_parties = models.ManyToManyField(
        "third_parties.ThirdParty", blank=True, related_name="risks"
    )
    business_unit = models.ForeignKey(
        "organizations.BusinessUnit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risks",
    )
    policies = models.ManyToManyField(
        "policies.Policy", blank=True, related_name="risks"
    )
    compliance_requirements = models.ManyToManyField(
        "compliance.Requirement", blank=True, related_name="risks"
    )
    # projects accessible via reverse: risk.projects (from Project.risks M2M)

    # Residual risk narrative
    residual_description = models.TextField(
        blank=True, help_text="Describe the residual risk after controls are applied"
    )

    # Dates
    identified_date = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    treatment_due_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Risk")
        verbose_name_plural = _("Risks")
        ordering = ["-inherent_score", "-created_at"]

    def save(self, *args, **kwargs):
        self.inherent_score = self.inherent_likelihood * self.inherent_impact
        self.residual_score = self.residual_likelihood * self.residual_impact
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def inherent_rating(self):
        score = self.inherent_score
        if score >= 15:
            return "critical"
        if score >= 10:
            return "high"
        if score >= 5:
            return "medium"
        return "low"

    @property
    def residual_rating(self):
        score = self.residual_score
        if score >= 15:
            return "critical"
        if score >= 10:
            return "high"
        if score >= 5:
            return "medium"
        return "low"


class RiskTreatmentPlan(BaseModel):
    risk = models.ForeignKey(
        Risk, on_delete=models.CASCADE, related_name="treatment_plans"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risk_treatment_plans",
    )
    due_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("overdue", "Overdue"),
        ],
        default="pending",
    )

    class Meta:
        verbose_name = _("Risk Treatment Plan")
        ordering = ["due_date"]

    def __str__(self):
        return f"{self.risk.title} \u2013 {self.title}"


class RiskReview(BaseModel):
    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risk_reviews",
    )
    review_date = models.DateField()
    notes = models.TextField(blank=True)
    residual_likelihood = models.PositiveSmallIntegerField(default=3)
    residual_impact = models.PositiveSmallIntegerField(default=3)

    class Meta:
        verbose_name = _("Risk Review")
        ordering = ["-review_date"]

    def __str__(self):
        return f"Review of {self.risk.title} on {self.review_date}"


class RiskAppetite(BaseModel):
    """
    Board / executive-approved tolerance for risk per category and business unit.
    Aligns with ISO 31000 and COSO ERM 'risk appetite' principles.
    """

    class ApprovalStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        APPROVED = "approved", _("Approved")
        REVOKED = "revoked", _("Revoked")

    name = models.CharField(max_length=200)
    statement = models.TextField(
        blank=True,
        help_text=_("Qualitative appetite statement (e.g. 'Zero tolerance for regulatory breaches')."),
    )
    category = models.ForeignKey(
        RiskCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appetites",
    )
    business_unit = models.ForeignKey(
        "organizations.BusinessUnit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appetites",
    )
    # Quantitative thresholds — risk score is likelihood × impact (1-25)
    threshold_green = models.PositiveSmallIntegerField(
        default=6, help_text=_("Score ≤ this = within appetite (green).")
    )
    threshold_amber = models.PositiveSmallIntegerField(
        default=12, help_text=_("Score ≤ this = approaching limit (amber).")
    )
    threshold_red = models.PositiveSmallIntegerField(
        default=20, help_text=_("Score ≥ this = exceeds appetite (red).")
    )
    max_acceptable_rating = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risk_appetites",
    )
    approval_status = models.CharField(
        max_length=15,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.DRAFT,
        db_index=True,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_risk_appetites",
    )
    approved_at = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = _("Risk Appetite")
        verbose_name_plural = _("Risk Appetites")
        ordering = ["name"]

    def __str__(self):
        return self.name


class KeyRiskIndicator(BaseModel):
    """
    Operational KRI with red/amber/green thresholds, supporting both
    'higher-is-worse' and 'lower-is-worse' metrics.
    """

    class Direction(models.TextChoices):
        HIGHER_WORSE = "higher_worse", _("Higher is Worse")
        LOWER_WORSE = "lower_worse", _("Lower is Worse")

    class Frequency(models.TextChoices):
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        ANNUALLY = "annually", _("Annually")

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    metric_unit = models.CharField(
        max_length=50, blank=True, help_text=_("e.g. count, %, hours, USD")
    )
    direction = models.CharField(
        max_length=20, choices=Direction.choices, default=Direction.HIGHER_WORSE
    )
    threshold_green = models.FloatField(default=0)
    threshold_amber = models.FloatField(default=0)
    threshold_red = models.FloatField(default=0)
    current_value = models.FloatField(null=True, blank=True)
    last_measured_at = models.DateTimeField(null=True, blank=True)
    measurement_frequency = models.CharField(
        max_length=15, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="kris",
    )
    related_risks = models.ManyToManyField(
        Risk, blank=True, related_name="kris"
    )
    business_unit = models.ForeignKey(
        "organizations.BusinessUnit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="kris",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Key Risk Indicator")
        verbose_name_plural = _("Key Risk Indicators")
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def status(self) -> str:
        """Return 'green' / 'amber' / 'red' / 'unknown' based on current_value."""
        if self.current_value is None:
            return "unknown"
        v = self.current_value
        if self.direction == self.Direction.HIGHER_WORSE:
            if v >= self.threshold_red:
                return "red"
            if v >= self.threshold_amber:
                return "amber"
            return "green"
        # LOWER_WORSE
        if v <= self.threshold_red:
            return "red"
        if v <= self.threshold_amber:
            return "amber"
        return "green"


class KRIMeasurement(BaseModel):
    """Time-series log of KRI readings for trending."""

    kri = models.ForeignKey(
        KeyRiskIndicator, on_delete=models.CASCADE, related_name="measurements"
    )
    value = models.FloatField()
    measured_at = models.DateTimeField()
    note = models.TextField(blank=True)

    class Meta:
        verbose_name = _("KRI Measurement")
        ordering = ["-measured_at"]

    def __str__(self):
        return f"{self.kri.name} = {self.value} @ {self.measured_at}"
