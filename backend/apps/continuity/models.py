from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class BusinessImpactAnalysis(BaseModel):
    business_process = models.OneToOneField(
        "organizations.BusinessProcess",
        on_delete=models.CASCADE,
        related_name="bia",
    )
    rto_hours = models.PositiveIntegerField(
        help_text="Recovery Time Objective in hours", default=24
    )
    rpo_hours = models.PositiveIntegerField(
        help_text="Recovery Point Objective in hours", default=4
    )
    mtpd_hours = models.PositiveIntegerField(
        help_text="Maximum Tolerable Period of Disruption in hours", default=72
    )
    financial_impact_per_hour = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    reputational_impact = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium",
    )
    dependencies = models.TextField(blank=True)
    minimum_resources = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Business Impact Analysis")
        verbose_name_plural = _("Business Impact Analyses")

    def __str__(self):
        return f"BIA: {self.business_process.name}"


class ContinuityPlan(BaseModel):
    class PlanStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        APPROVED = "approved", _("Approved")
        RETIRED = "retired", _("Retired")

    title = models.CharField(max_length=255)
    scope = models.TextField()
    objectives = models.TextField()
    triggers = models.TextField()
    procedures = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="continuity_plans",
    )
    status = models.CharField(
        max_length=10, choices=PlanStatus.choices, default=PlanStatus.DRAFT
    )
    version = models.CharField(max_length=20, default="1.0")
    approved_at = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    business_processes = models.ManyToManyField(
        "organizations.BusinessProcess",
        blank=True,
        related_name="continuity_plans",
    )

    class Meta:
        verbose_name = _("Continuity Plan")
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} v{self.version}"


class ContinuityTest(BaseModel):
    class TestType(models.TextChoices):
        TABLETOP = "tabletop", _("Tabletop Exercise")
        SIMULATION = "simulation", _("Simulation")
        FULL_ACTIVATION = "full_activation", _("Full Activation")
        WALKTHROUGH = "walkthrough", _("Walkthrough")

    class TestStatus(models.TextChoices):
        SCHEDULED = "scheduled", _("Scheduled")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    plan = models.ForeignKey(
        ContinuityPlan, on_delete=models.CASCADE, related_name="tests"
    )
    test_type = models.CharField(max_length=20, choices=TestType.choices)
    test_date = models.DateField()
    status = models.CharField(
        max_length=15, choices=TestStatus.choices, default=TestStatus.SCHEDULED
    )
    lead_tester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="continuity_tests_led",
    )
    objectives = models.TextField()
    result_summary = models.TextField(blank=True)
    rto_achieved_hours = models.PositiveIntegerField(null=True, blank=True)
    issues_found = models.TextField(blank=True)
    lessons_learned = models.TextField(blank=True)
    next_test_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = _("Continuity Test")
        ordering = ["-test_date"]

    def __str__(self):
        return f"Test of {self.plan.title} on {self.test_date}"
