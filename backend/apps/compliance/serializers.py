"""Serializers for the Compliance Management app."""

from rest_framework import serializers

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
    ComplianceFrameworkTemplate,
    ComplianceProgram,
    Evidence,
    Requirement,
)


class ComplianceFrameworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFramework
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ComplianceProgramSerializer(serializers.ModelSerializer):
    framework_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    requirements_count = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceProgram
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_framework_name(self, obj):
        return str(obj.framework) if obj.framework_id else None

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_requirements_count(self, obj):
        return obj.framework.requirements.count() if obj.framework_id else 0


class ComplianceAssessmentSerializer(serializers.ModelSerializer):
    requirement_ref = serializers.SerializerMethodField()
    requirement_title = serializers.SerializerMethodField()
    assessor_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceAssessment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_requirement_ref(self, obj):
        return obj.requirement.ref_code if obj.requirement_id else None

    def get_requirement_title(self, obj):
        return obj.requirement.title if obj.requirement_id else None

    def get_assessor_name(self, obj):
        if obj.assessor_id:
            return obj.assessor.get_full_name() or obj.assessor.email
        return None


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ComplianceFrameworkTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFrameworkTemplate
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
