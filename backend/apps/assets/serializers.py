"""
Serializers for the assets app.
"""

from rest_framework import serializers

from .models import Asset, AssetCategory, DataAsset, DataFlow


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = [
            "id",
            "name",
            "description",
            "color",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name", read_only=True
    )
    owner_name = serializers.CharField(
        source="owner.get_full_name", read_only=True
    )
    business_unit_name = serializers.CharField(
        source="business_unit.name", read_only=True
    )

    class Meta:
        model = Asset
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "owner",
            "owner_name",
            "business_unit",
            "business_unit_name",
            "criticality",
            "confidentiality",
            "integrity",
            "availability",
            "asset_value",
            "status",
            "notes",
            "tags",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class DataAssetSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = DataAsset
        fields = [
            "id",
            "asset",
            "asset_name",
            "classification",
            "retention_period_days",
            "processing_purpose",
            "legal_basis",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class DataFlowSerializer(serializers.ModelSerializer):
    source_asset_name = serializers.CharField(
        source="source_asset.name", read_only=True
    )
    destination_asset_name = serializers.CharField(
        source="destination_asset.name", read_only=True
    )
    processing_activity_name = serializers.CharField(
        source="processing_activity.name", read_only=True, default=""
    )
    lifecycle_stage_display = serializers.CharField(
        source="get_lifecycle_stage_display", read_only=True
    )

    class Meta:
        model = DataFlow
        fields = [
            "id",
            "name",
            "source_asset",
            "source_asset_name",
            "destination_asset",
            "destination_asset_name",
            "data_types",
            "transfer_mechanism",
            "is_cross_border",
            "notes",
            # GDPR fields
            "legal_basis",
            "data_subject_categories",
            "personal_data_categories",
            "special_category_data",
            "retention_period_days",
            "transfer_safeguards",
            "lifecycle_stage",
            "lifecycle_stage_display",
            "processing_activity",
            "processing_activity_name",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
