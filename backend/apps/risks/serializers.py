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
    owner_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

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

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None


class RiskTreatmentPlanSerializer(serializers.ModelSerializer):
    risk_title = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = RiskTreatmentPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_risk_title(self, obj):
        return obj.risk.title if obj.risk_id else None

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None


class RiskReviewSerializer(serializers.ModelSerializer):
    risk_title = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = RiskReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_risk_title(self, obj):
        return obj.risk.title if obj.risk_id else None

    def get_reviewer_name(self, obj):
        if obj.reviewer_id:
            return obj.reviewer.get_full_name() or obj.reviewer.email
        return None
