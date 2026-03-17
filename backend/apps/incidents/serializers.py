"""Serializers for the Incident Management app."""
from rest_framework import serializers

from .models import Incident, IncidentCategory, IncidentUpdate


class IncidentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class IncidentSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "contained_at",
            "resolved_at",
            "closed_at",
        ]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None


class IncidentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentUpdate
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
