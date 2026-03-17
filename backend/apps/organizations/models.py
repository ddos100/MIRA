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
