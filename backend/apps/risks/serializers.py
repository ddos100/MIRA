"""Serializers for the Risk Management app."""
from rest_framework import serializers

from .models import Risk, RiskCategory, RiskReview, RiskTreatmentPlan


class RiskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class RiskSerializer(serializers.ModelSerializer):
    inherent_rating = serializers.CharField(read_only=True)
    residual_rating = serializers.CharField(read_only=True)

    class Meta:
        model = Risk
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "inherent_score",
            "residual_score",
            "inherent_rating",
            "residual_rating",
        ]


class RiskTreatmentPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskTreatmentPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class RiskReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
