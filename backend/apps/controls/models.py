from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class ControlCategory(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Control Category")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Control(BaseModel):
    class ControlType(models.TextChoices):
        PREVENTIVE = "preventive", _("Preventive")
        DETECTIVE = "detective", _("Detective")
        CORRECTIVE = "corrective", _("Corrective")
        DIRECTIVE = "directive", _("Directive")

    class Frequency(models.TextChoices):
        CONTINUOUS = "continuous", _("Continuous")
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        ANNUALLY = "annually", _("Annually")

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        UNDER_REVIEW = "under_review", _("Under Review")

    title = models.CharField(max_length=255)
    description = models.TextField()
    control_type = models.CharField(
        max_length=20, choices=ControlType.choices, default=ControlType.PREVENTIVE
    )
    frequency = models.CharField(
        max_length=20, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_controls",
    )
    category = models.ForeignKey(
        ControlCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="controls",
    )
    business_unit = models.ForeignKey(
        "organizations.BusinessUnit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="controls",
    )
    compliance_requirements = models.ManyToManyField(
        "compliance.Requirement", blank=True, related_name="controls"
    )
    risks = models.ManyToManyField("risks.Risk", blank=True, related_name="controls")
    # policies accessible via reverse: control.policies (from Policy.controls M2M)
    # projects accessible via reverse: control.projects (from Project.controls M2M)
    version = models.CharField(max_length=20, default="1.0")
    last_review_date = models.DateField(null=True, blank=True)
    next_review_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Control")
        ordering = ["title"]

    def __str__(self):
        return self.title


class ControlTest(BaseModel):
    class Result(models.TextChoices):
        PASS = "pass", _("Pass")
        FAIL = "fail", _("Fail")
        PARTIAL = "partial", _("Partial")
        NOT_TESTED = "not_tested", _("Not Tested")

    control = models.ForeignKey(Control, on_delete=models.CASCADE, related_name="tests")
    tester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="control_tests",
    )
    test_date = models.DateField()
    result = models.CharField(
        max_length=15, choices=Result.choices, default=Result.NOT_TESTED
    )
    description = models.TextField(blank=True)
    evidence_description = models.TextField(blank=True)
    evidence_file = models.FileField(
        upload_to="control_evidence/%Y/%m/",
        null=True,
        blank=True,
        verbose_name=_("Evidence File"),
        help_text=_("Upload a supporting evidence document for this test"),
    )
    next_test_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = _("Control Test")
        ordering = ["-test_date"]

    def __str__(self):
        return f"Test of {self.control.title} on {self.test_date}: {self.result}"


class ControlIssue(BaseModel):
    class Severity(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    class IssueStatus(models.TextChoices):
        OPEN = "open", _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        RESOLVED = "resolved", _("Resolved")
        ACCEPTED = "accepted", _("Accepted")

    control = models.ForeignKey(
        Control, on_delete=models.CASCADE, related_name="issues"
    )
    control_test = models.ForeignKey(
        ControlTest,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="issues",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=IssueStatus.choices, default=IssueStatus.OPEN
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="control_issues",
    )
    due_date = models.DateField(null=True, blank=True)
    resolution_date = models.DateField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Control Issue")
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity}] {self.title}"
