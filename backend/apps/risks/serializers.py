"""Serializers for the Risk Management app."""

from rest_framework import serializers

from apps.controls.models import Control
from apps.projects.models import Project
from apps.threats.models import Threat, Vulnerability

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
    asset_names = serializers.SerializerMethodField()
    project_names = serializers.SerializerMethodField()
    threat_names = serializers.SerializerMethodField()
    vulnerability_names = serializers.SerializerMethodField()

    # Reverse M2M: Control.risks → exposed on Risk as writable IDs
    controls = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Control.objects.all(),
        required=False,
    )

    # Reverse M2M: Project.risks → exposed on Risk as writable IDs
    projects = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Project.objects.all(),
        required=False,
    )

    # Direct M2M: threats and vulnerabilities
    threats = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Threat.objects.all(),
        required=False,
    )
    vulnerabilities = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Vulnerability.objects.all(),
        required=False,
    )

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

    def get_asset_names(self, obj):
        return list(obj.assets.values_list("name", flat=True))

    def get_project_names(self, obj):
        return list(obj.projects.values_list("title", flat=True))

    def get_threat_names(self, obj):
        return list(obj.threats.values_list("name", flat=True))

    def get_vulnerability_names(self, obj):
        return list(obj.vulnerabilities.values_list("name", flat=True))

    def _set_reverse_m2m(self, instance, controls, projects):
        """Sync reverse M2M relations that aren't direct model fields."""
        if controls is not None:
            instance.controls.set(controls)
        if projects is not None:
            instance.projects.set(projects)

    def create(self, validated_data):
        controls = validated_data.pop("controls", None)
        projects = validated_data.pop("projects", None)
        instance = super().create(validated_data)
        self._set_reverse_m2m(instance, controls, projects)
        return instance

    def update(self, instance, validated_data):
        controls = validated_data.pop("controls", None)
        projects = validated_data.pop("projects", None)
        instance = super().update(instance, validated_data)
        self._set_reverse_m2m(instance, controls, projects)
        return instance


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
