"""
Serializers for the organizations app.
"""
from rest_framework import serializers

from .models import BusinessProcess, BusinessUnit


class RecursiveBusinessUnitSerializer(serializers.Serializer):
    """Recursively serialize children of a BusinessUnit."""

    def to_representation(self, value):
        serializer = BusinessUnitSerializer(value, context=self.context)
        return serializer.data


class BusinessUnitSerializer(serializers.ModelSerializer):
    """Read serializer for BusinessUnit with nested children (depth 3)."""

    children = RecursiveBusinessUnitSerializer(many=True, read_only=True)
    organization_head_name = serializers.CharField(
        source="organization_head.get_full_name", read_only=True
    )

    class Meta:
        model = BusinessUnit
        fields = [
            "id",
            "name",
            "description",
            "parent",
            "code",
            "is_active",
            "organization_head",
            "organization_head_name",
            "children",
            "level",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by", "level"]


class BusinessProcessSerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(
        source="business_unit.name", read_only=True
    )
    owner_name = serializers.CharField(
        source="owner.get_full_name", read_only=True
    )

    class Meta:
        model = BusinessProcess
        fields = [
            "id",
            "name",
            "description",
            "business_unit",
            "business_unit_name",
            "owner",
            "owner_name",
            "criticality",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]
