from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel


class PolicyCategory(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Policy(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        UNDER_REVIEW = "under_review", _("Under Review")
        APPROVED = "approved", _("Approved")
        RETIRED = "retired", _("Retired")

    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    content = models.TextField()  # Rich text/HTML
    category = models.ForeignKey(
        PolicyCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="policies",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_policies",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    version = models.CharField(max_length=20, default="1.0")
    effective_date = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    acknowledgement_required = models.BooleanField(default=False)
    acknowledgement_deadline = models.DateField(null=True, blank=True)
    compliance_requirements = models.ManyToManyField(
        "compliance.Requirement", blank=True, related_name="policies"
    )
    controls = models.ManyToManyField(
        "controls.Control", blank=True, related_name="policies"
    )

    class Meta:
        verbose_name = _("Policy")
        verbose_name_plural = _("Policies")
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} v{self.version}"


class PolicyAcknowledgement(BaseModel):
    policy = models.ForeignKey(
        Policy, on_delete=models.CASCADE, related_name="acknowledgements"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="policy_acknowledgements",
    )
    acknowledged_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        unique_together = [("policy", "user")]
        ordering = ["-acknowledged_at"]

    def __str__(self):
        return f"{self.user} acknowledged {self.policy}"


class PolicyReview(BaseModel):
    class ReviewResult(models.TextChoices):
        NO_CHANGES = "no_changes", _("No Changes Required")
        MINOR_CHANGES = "minor_changes", _("Minor Changes Required")
        MAJOR_CHANGES = "major_changes", _("Major Changes Required")
        RETIRE = "retire", _("Retire Policy")

    policy = models.ForeignKey(
        Policy, on_delete=models.CASCADE, related_name="reviews"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="policy_reviews",
    )
    review_date = models.DateField()
    result = models.CharField(max_length=20, choices=ReviewResult.choices)
    notes = models.TextField(blank=True)
    next_review_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-review_date"]

    def __str__(self):
        return f"Review of {self.policy.title} on {self.review_date}"
