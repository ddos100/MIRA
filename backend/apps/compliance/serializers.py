"""Serializers for the Compliance Management app."""
from rest_framework import serializers

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
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
    class Meta:
        model = ComplianceProgram
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ComplianceAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceAssessment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
