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
    """An organizational asset (system, application, hardware, data store, etc.)."""

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        RETIRED = "retired", _("Retired")

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
    """Additional data-specific attributes linked to an Asset via one-to-one."""

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

    class Meta:
        verbose_name = _("Data Flow")
        verbose_name_plural = _("Data Flows")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}: {self.source_asset} → {self.destination_asset}"
