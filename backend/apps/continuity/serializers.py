from rest_framework import serializers

from .models import BusinessImpactAnalysis, ContinuityPlan, ContinuityTest


class BusinessImpactAnalysisSerializer(serializers.ModelSerializer):
    business_process_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessImpactAnalysis
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_business_process_name(self, obj):
        return obj.business_process.name if obj.business_process_id else None


class ContinuityPlanSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = ContinuityPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None


class ContinuityTestSerializer(serializers.ModelSerializer):
    plan_title = serializers.SerializerMethodField()
    lead_tester_name = serializers.SerializerMethodField()

    class Meta:
        model = ContinuityTest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_plan_title(self, obj):
        return obj.plan.title if obj.plan_id else None

    def get_lead_tester_name(self, obj):
        if obj.lead_tester_id:
            return obj.lead_tester.get_full_name() or obj.lead_tester.email
        return None
