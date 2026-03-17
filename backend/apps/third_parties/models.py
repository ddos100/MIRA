from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class ThirdParty(BaseModel):
    class RiskTier(models.TextChoices):
        TIER1 = "tier1", _("Tier 1 – Critical")
        TIER2 = "tier2", _("Tier 2 – High")
        TIER3 = "tier3", _("Tier 3 – Medium")
        TIER4 = "tier4", _("Tier 4 – Low")

    class VendorType(models.TextChoices):
        SUPPLIER = "supplier", _("Supplier")
        PARTNER = "partner", _("Partner")
        CONTRACTOR = "contractor", _("Contractor")
        CLOUD_PROVIDER = "cloud_provider", _("Cloud Provider")
        SUBPROCESSOR = "subprocessor", _("Sub-Processor")
        OTHER = "other", _("Other")

    name = models.CharField(max_length=255)
    vendor_type = models.CharField(
        max_length=20, choices=VendorType.choices, default=VendorType.SUPPLIER
    )
    risk_tier = models.CharField(
        max_length=10, choices=RiskTier.choices, default=RiskTier.TIER3
    )
    website = models.URLField(blank=True)
    contact_name = models.CharField(max_length=150, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_vendors",
    )
    contract_start = models.DateField(null=True, blank=True)
    contract_end = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    services_provided = models.TextField(blank=True)
    data_shared = models.BooleanField(default=False)
    processing_personal_data = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Third Party")
        verbose_name_plural = _("Third Parties")
        ordering = ["name"]

    def __str__(self):
        return self.name


class ThirdPartyReview(BaseModel):
    class ReviewStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        OVERDUE = "overdue", _("Overdue")

    third_party = models.ForeignKey(
        ThirdParty, on_delete=models.CASCADE, related_name="reviews"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="vendor_reviews",
    )
    review_date = models.DateField()
    status = models.CharField(
        max_length=15, choices=ReviewStatus.choices, default=ReviewStatus.PENDING
    )
    risk_rating = models.CharField(
        max_length=10, choices=ThirdParty.RiskTier.choices, null=True, blank=True
    )
    findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    next_review_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-review_date"]

    def __str__(self):
        return f"Review of {self.third_party.name} on {self.review_date}"
