"""
Organization structure models: Business Units and Business Processes.
"""

from django.conf import settings
from django.db import models
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
