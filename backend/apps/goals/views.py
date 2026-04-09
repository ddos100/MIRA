from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Goal, GoalAuditSchedule, GoalCategory, GoalReview
from .serializers import (
    GoalAuditScheduleSerializer,
    GoalCategorySerializer,
    GoalReviewSerializer,
    GoalSerializer,
)


class GoalCategoryViewSet(viewsets.ModelViewSet):
    queryset = GoalCategory.objects.all()
    serializer_class = GoalCategorySerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class GoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for Goals with review/audit schedule management.
    Supports filtering by status, business_unit, owner.
    """

    queryset = Goal.objects.select_related(
        "category", "owner", "business_unit"
    ).prefetch_related("reviews").all()
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "business_unit", "owner", "category", "review_frequency"]
    search_fields = ["title", "description", "objective", "iso27001_clause"]
    ordering_fields = ["title", "target_date", "status", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="update-progress")
    def update_progress(self, request, pk=None):
        """Quick endpoint to update the current value of a goal."""
        goal = self.get_object()
        current_value = request.data.get("current_value")
        if current_value is None:
            return Response(
                {"error": "current_value is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        goal.current_value = float(current_value)
        goal.updated_by = request.user
        goal.save(update_fields=["current_value", "updated_by", "updated_at"])
        return Response(GoalSerializer(goal).data)


class GoalReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD for Goal Reviews with Maker/Checker workflow.
    Reviewer (Maker) creates and submits; Approver (Checker) approves or rejects.
    """

    queryset = GoalReview.objects.select_related(
        "goal", "reviewer", "approver"
    ).all()
    serializer_class = GoalReviewSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["goal", "workflow_state", "outcome", "reviewer", "approver"]
    ordering_fields = ["review_date", "created_at"]

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            reviewer=self.request.user,
        )

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Maker submits review for checker approval."""
        review = self.get_object()
        if review.workflow_state != GoalReview.WorkflowState.DRAFT:
            return Response(
                {"error": "Only draft reviews can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        review.workflow_state = GoalReview.WorkflowState.SUBMITTED
        review.submitted_at = timezone.now()
        review.updated_by = request.user
        review.save(update_fields=["workflow_state", "submitted_at", "updated_by", "updated_at"])

        # Update goal's last review date
        review.goal.last_review_date = review.review_date
        if review.next_review_date:
            review.goal.next_review_date = review.next_review_date
        review.goal.save(update_fields=["last_review_date", "next_review_date", "updated_at"])

        return Response(GoalReviewSerializer(review).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Checker approves the review."""
        review = self.get_object()
        if review.workflow_state != GoalReview.WorkflowState.SUBMITTED:
            return Response(
                {"error": "Only submitted reviews can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        review.workflow_state = GoalReview.WorkflowState.APPROVED
        review.approver = request.user
        review.approved_at = timezone.now()
        review.updated_by = request.user
        review.save(
            update_fields=[
                "workflow_state", "approver", "approved_at", "updated_by", "updated_at"
            ]
        )

        # Update goal status based on outcome
        outcome_to_status = {
            GoalReview.Outcome.ON_TRACK: Goal.Status.ON_TRACK,
            GoalReview.Outcome.AT_RISK: Goal.Status.AT_RISK,
            GoalReview.Outcome.BEHIND: Goal.Status.BEHIND,
            GoalReview.Outcome.COMPLETED: Goal.Status.COMPLETED,
        }
        new_status = outcome_to_status.get(review.outcome)
        if new_status:
            review.goal.status = new_status
            if review.current_value is not None:
                review.goal.current_value = review.current_value
            review.goal.save(update_fields=["status", "current_value", "updated_at"])

        return Response(GoalReviewSerializer(review).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Checker rejects the review with a reason."""
        review = self.get_object()
        if review.workflow_state != GoalReview.WorkflowState.SUBMITTED:
            return Response(
                {"error": "Only submitted reviews can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "")
        review.workflow_state = GoalReview.WorkflowState.REJECTED
        review.rejection_reason = reason
        review.approver = request.user
        review.updated_by = request.user
        review.save(
            update_fields=[
                "workflow_state", "rejection_reason", "approver", "updated_by", "updated_at"
            ]
        )
        return Response(GoalReviewSerializer(review).data)


class GoalAuditScheduleViewSet(viewsets.ModelViewSet):
    queryset = GoalAuditSchedule.objects.select_related("goal", "assigned_auditor").all()
    serializer_class = GoalAuditScheduleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["goal", "frequency", "is_active"]
