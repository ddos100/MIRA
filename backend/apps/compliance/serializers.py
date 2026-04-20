"""Serializers for the Compliance Management app."""

from rest_framework import serializers

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
    ComplianceFrameworkTemplate,
    ComplianceProgram,
    Evidence,
    Requirement,
    RequirementMapping,
)


class ComplianceFrameworkSerializer(serializers.ModelSerializer):
    requirements_count = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceFramework
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_requirements_count(self, obj):
        return obj.requirements.count()


class RequirementSerializer(serializers.ModelSerializer):
    framework_name = serializers.SerializerMethodField()
    parent_ref = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    policies_count = serializers.SerializerMethodField()
    controls_count = serializers.SerializerMethodField()
    mappings_count = serializers.SerializerMethodField()

    class Meta:
        model = Requirement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_framework_name(self, obj):
        return str(obj.framework) if obj.framework_id else None

    def get_parent_ref(self, obj):
        return obj.parent.ref_code if obj.parent_id else None

    def get_children_count(self, obj):
        return obj.children.count()

    def get_policies_count(self, obj):
        return obj.policies.count()

    def get_controls_count(self, obj):
        return obj.controls.count()

    def get_mappings_count(self, obj):
        return obj.mappings_as_source.count() + obj.mappings_as_target.count()


class RequirementMappingSerializer(serializers.ModelSerializer):
    source_ref = serializers.SerializerMethodField()
    source_title = serializers.SerializerMethodField()
    source_framework = serializers.SerializerMethodField()
    target_ref = serializers.SerializerMethodField()
    target_title = serializers.SerializerMethodField()
    target_framework = serializers.SerializerMethodField()

    class Meta:
        model = RequirementMapping
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_source_ref(self, obj):
        return obj.source.ref_code if obj.source_id else None

    def get_source_title(self, obj):
        return obj.source.title if obj.source_id else None

    def get_source_framework(self, obj):
        return obj.source.framework.short_name if obj.source_id else None

    def get_target_ref(self, obj):
        return obj.target.ref_code if obj.target_id else None

    def get_target_title(self, obj):
        return obj.target.title if obj.target_id else None

    def get_target_framework(self, obj):
        return obj.target.framework.short_name if obj.target_id else None


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
    owner_name = serializers.SerializerMethodField()
    assessor_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceAssessment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_requirement_ref(self, obj):
        return obj.requirement.ref_code if obj.requirement_id else None

    def get_requirement_title(self, obj):
        return obj.requirement.title if obj.requirement_id else None

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

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
