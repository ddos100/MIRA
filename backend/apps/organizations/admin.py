"""
Admin registration for the organizations app.
"""

from django.contrib import admin
from mptt.admin import MPTTModelAdmin

from .models import BusinessProcess, BusinessUnit


@admin.register(BusinessUnit)
class BusinessUnitAdmin(MPTTModelAdmin):
    list_display = ["name", "code", "organization_head", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]
    raw_id_fields = ["organization_head"]


@admin.register(BusinessProcess)
class BusinessProcessAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "business_unit",
        "owner",
        "criticality",
        "is_active",
        "created_at",
    ]
    list_filter = ["criticality", "is_active", "business_unit"]
    search_fields = ["name", "description"]
    raw_id_fields = ["business_unit", "owner"]
