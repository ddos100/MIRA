"""Serializers for the Policy Management app."""
from rest_framework import serializers

from .models import Policy, PolicyAcknowledgement, PolicyCategory, PolicyReview


class PolicyCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class PolicyAcknowledgementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyAcknowledgement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "acknowledged_at"]


class PolicyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
