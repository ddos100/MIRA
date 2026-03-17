from rest_framework import serializers

from .models import BusinessImpactAnalysis, ContinuityPlan, ContinuityTest


class BusinessImpactAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessImpactAnalysis
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ContinuityPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContinuityPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ContinuityTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContinuityTest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
