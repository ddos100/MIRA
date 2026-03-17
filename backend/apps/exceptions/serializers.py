"""Serializers for the Exception Management app."""
from rest_framework import serializers

from .models import GRCException


class GRCExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GRCException
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "approved_at", "is_expired"]
