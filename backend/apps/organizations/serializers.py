"""
Serializers for the organizations app.
"""

from rest_framework import serializers

from .models import (
    BusinessProcess, BusinessUnit, OrgSettings,
    OrganizationalIssue, RiskOpportunity,
    Scope, ScopeApprovalHistory,
)


class RecursiveBusinessUnitSerializer(serializers.Serializer):
    def to_representation(self, value):
        serializer = BusinessUnitSerializer(value, context=self.context)
        return serializer.data


class BusinessUnitSerializer(serializers.ModelSerializer):
    children = RecursiveBusinessUnitSerializer(many=True, read_only=True)
    organization_head_name = serializers.CharField(
        source="organization_head.get_full_name", read_only=True
    )

    class Meta:
        model = BusinessUnit
        fields = [
            "id", "name", "description", "parent", "code", "is_active",
            "organization_head", "organization_head_name", "children", "level",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by", "level"]


class BusinessProcessSerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(source="business_unit.name", read_only=True)
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)

    class Meta:
        model = BusinessProcess
        fields = [
            "id", "name", "description", "business_unit", "business_unit_name",
            "owner", "owner_name", "criticality", "is_active",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]


class OrgSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgSettings
        fields = [
            "id", "org_name", "description", "timezone", "primary_contact_email",
            "logo", "max_risk_score", "risk_review_days", "policy_review_days",
            "enable_2fa_required",
        ]
        read_only_fields = ["id"]


class ScopeApprovalHistorySerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(
        source="approved_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = ScopeApprovalHistory
        fields = [
            "id", "version", "approved_by", "approved_by_name",
            "approved_at", "next_review_date", "notes",
        ]
        read_only_fields = ["id", "approved_at"]


class ScopeSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    approver_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    workflow_state_display = serializers.CharField(source="get_workflow_state_display", read_only=True)
    review_periodicity_display = serializers.SerializerMethodField()
    approval_history = ScopeApprovalHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Scope
        fields = [
            "id", "title", "content", "version",
            "status", "status_display",
            "workflow_state", "workflow_state_display",
            "effective_date",
            "review_periodicity_days", "review_periodicity_display",
            "next_review_date",
            "reviewer", "reviewer_name",
            "approver", "approver_name",
            "submitted_at", "approved_at", "rejection_reason",
            "approval_history",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = [
            "id", "submitted_at", "approved_at",
            "next_review_date",   # auto-computed on approval
            "created_at", "updated_at", "created_by", "updated_by",
        ]

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() if obj.reviewer else ""

    def get_approver_name(self, obj):
        return obj.approver.get_full_name() if obj.approver else ""

    def get_review_periodicity_display(self, obj):
        return dict(Scope.PERIODICITY_CHOICES).get(obj.review_periodicity_days, f"{obj.review_periodicity_days} days")


class OrganizationalIssueSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default="")
    issue_type_display = serializers.CharField(source="get_issue_type_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    impact_level_display = serializers.CharField(source="get_impact_level_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    linked_risk_names = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationalIssue
        fields = [
            "id", "title", "description",
            "issue_type", "issue_type_display",
            "category", "category_display",
            "impact_level", "impact_level_display",
            "status", "status_display",
            "owner", "owner_name",
            "due_date", "resolution_notes",
            "linked_risks", "linked_risk_names",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def get_linked_risk_names(self, obj):
        return list(obj.linked_risks.values_list("title", flat=True))


class RiskOpportunitySerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default="")
    item_type_display = serializers.CharField(source="get_item_type_display", read_only=True)
    treatment_display = serializers.CharField(source="get_treatment_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    residual_level_display = serializers.CharField(source="get_residual_level_display", read_only=True)
    linked_issue_title = serializers.CharField(source="linked_issue.title", read_only=True, default="")
    risk_score = serializers.IntegerField(read_only=True)
    likelihood_display = serializers.CharField(source="get_likelihood_display", read_only=True)
    impact_display = serializers.CharField(source="get_impact_display", read_only=True)

    class Meta:
        model = RiskOpportunity
        fields = [
            "id", "title", "description",
            "item_type", "item_type_display",
            "linked_issue", "linked_issue_title",
            "likelihood", "likelihood_display",
            "impact", "impact_display",
            "risk_score",
            "treatment", "treatment_display",
            "treatment_plan",
            "residual_level", "residual_level_display",
            "status", "status_display",
            "owner", "owner_name",
            "due_date", "review_notes",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["id", "risk_score", "created_at", "updated_at", "created_by", "updated_by"]
