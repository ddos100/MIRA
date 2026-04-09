from django.utils import timezone
from rest_framework import serializers

from .models import Goal, GoalAuditSchedule, GoalCategory, GoalReview


class GoalCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalCategory
        fields = ["id", "name", "description", "color"]


class GoalAuditScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalAuditSchedule
        fields = [
            "id",
            "frequency",
            "assigned_auditor",
            "next_audit_date",
            "last_audit_date",
            "audit_criteria",
            "is_active",
        ]


class GoalReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(
        source="reviewer.get_full_name", read_only=True
    )
    approver_name = serializers.CharField(
        source="approver.get_full_name", read_only=True, default=None
    )
    goal_title = serializers.CharField(source="goal.title", read_only=True)

    class Meta:
        model = GoalReview
        fields = [
            "id",
            "goal",
            "goal_title",
            "review_date",
            "reviewer",
            "reviewer_name",
            "approver",
            "approver_name",
            "workflow_state",
            "outcome",
            "current_value",
            "findings",
            "recommendations",
            "actions_required",
            "next_review_date",
            "submitted_at",
            "approved_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "submitted_at", "approved_at", "created_at", "updated_at"]


class GoalSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="owner.get_full_name", read_only=True, default=None
    )
    business_unit_name = serializers.CharField(
        source="business_unit.name", read_only=True, default=None
    )
    category_name = serializers.CharField(
        source="category.name", read_only=True, default=None
    )
    progress_pct = serializers.FloatField(read_only=True)
    review_count = serializers.SerializerMethodField()
    latest_review = serializers.SerializerMethodField()
    audit_schedule = GoalAuditScheduleSerializer(read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "title",
            "description",
            "objective",
            "measurable_target",
            "unit",
            "baseline_value",
            "target_value",
            "current_value",
            "progress_pct",
            "category",
            "category_name",
            "owner",
            "owner_name",
            "business_unit",
            "business_unit_name",
            "start_date",
            "target_date",
            "status",
            "iso27001_clause",
            "review_frequency",
            "next_review_date",
            "last_review_date",
            "notes",
            "review_count",
            "latest_review",
            "audit_schedule",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_latest_review(self, obj):
        review = obj.reviews.order_by("-review_date").first()
        if review:
            return {
                "id": str(review.id),
                "review_date": review.review_date,
                "outcome": review.outcome,
                "workflow_state": review.workflow_state,
            }
        return None
