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
    category_name = serializers.CharField(source="category.name", read_only=True)
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)
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
