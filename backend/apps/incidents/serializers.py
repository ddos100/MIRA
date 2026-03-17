"""Serializers for the Incident Management app."""
from rest_framework import serializers

from .models import Incident, IncidentCategory, IncidentUpdate


class IncidentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class IncidentSerializer(serializers.ModelSerializer):
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


class IncidentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentUpdate
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
