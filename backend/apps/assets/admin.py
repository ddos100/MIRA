"""
Admin registration for the assets app.
"""

from django.contrib import admin

from .models import Asset, AssetCategory, DataAsset, DataFlow


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "created_at"]
    search_fields = ["name", "description"]


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "owner",
        "business_unit",
        "criticality",
        "status",
        "created_at",
    ]
    list_filter = ["status", "criticality", "category"]
    search_fields = ["name", "description"]
    raw_id_fields = ["category", "owner", "business_unit"]
    filter_horizontal = ["tags"]


@admin.register(DataAsset)
class DataAssetAdmin(admin.ModelAdmin):
    list_display = ["asset", "classification", "retention_period_days", "created_at"]
    list_filter = ["classification"]
    search_fields = ["asset__name", "processing_purpose", "legal_basis"]
    raw_id_fields = ["asset"]


@admin.register(DataFlow)
class DataFlowAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "source_asset",
        "destination_asset",
        "is_cross_border",
        "created_at",
    ]
    list_filter = ["is_cross_border"]
    search_fields = ["name", "data_types", "transfer_mechanism"]
    raw_id_fields = ["source_asset", "destination_asset"]
