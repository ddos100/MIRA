"""Serializers for the Internal Controls app."""
from rest_framework import serializers

from .models import Control, ControlCategory, ControlIssue, ControlTest


class ControlCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ControlSerializer(serializers.ModelSerializer):
    class Meta:
        model = Control
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ControlTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlTest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ControlIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlIssue
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
