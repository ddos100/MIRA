"""Views for the Policy Management app."""

from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin
from apps.core.models import Notification

from .models import Policy, PolicyAcknowledgement, PolicyCategory, PolicyReview, PolicyVersion
from .serializers import (
    PolicyAcknowledgementSerializer,
    PolicyCategorySerializer,
    PolicyReviewSerializer,
    PolicySerializer,
    PolicyVersionSerializer,
)

User = get_user_model()


class PolicyCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Categories."""

    queryset = PolicyCategory.objects.all()
    serializer_class = PolicyCategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class PolicyViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for Policies with filtering, search, CSV export and import."""

    csv_filename = "policies"
    csv_export_fields = [
        "id",
        "title",
        "status",
        "version",
        "effective_date",
        "review_date",
        "acknowledgement_required",
        "created_at",
    ]
    csv_import_fields = ["title", "status", "version", "summary", "content"]

    queryset = Policy.objects.select_related("category", "owner").prefetch_related(
        "compliance_requirements", "controls"
    )
    serializer_class = PolicySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "category", "owner", "acknowledgement_required"]
    search_fields = ["title", "summary", "content"]
    ordering_fields = ["title", "status", "effective_date", "review_date", "created_at"]

    @action(detail=False, methods=["get"], url_path="pending-acknowledgements")
    def pending_acknowledgements(self, request):
        """
        ISO 27001 A.5.1 — report active policies requiring acknowledgement that
        the current user has not yet acknowledged.

        Pass ?user=<id> (admin only) to check another user.
        """
        user_id = request.query_params.get("user")
        user = request.user
        if user_id and request.user.is_staff:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return Response({"detail": "User not found."}, status=404)

        required = Policy.objects.filter(
            status="approved",
            acknowledgement_required=True,
        )
        ack_policy_ids = PolicyAcknowledgement.objects.filter(
            user=user
        ).values_list("policy_id", flat=True)
        pending = required.exclude(pk__in=ack_policy_ids)
        return Response(PolicySerializer(pending, many=True).data)

    @action(
        detail=False,
        methods=["post"],
        url_path="send-acknowledgement-reminders",
        permission_classes=[permissions.IsAdminUser],
    )
    def send_acknowledgement_reminders(self, request):
        """
        ISO 27001 A.5.1 — create in-app notifications for every active user
        who has not yet acknowledged a required approved policy.

        Staff-only. Returns count of notifications created.
        """
        required_policies = Policy.objects.filter(
            status="approved", acknowledgement_required=True
        )
        active_users = User.objects.filter(is_active=True, is_deleted=False)
        created = 0
        for user in active_users:
            acked_ids = set(
                PolicyAcknowledgement.objects.filter(user=user)
                .values_list("policy_id", flat=True)
            )
            for policy in required_policies.exclude(pk__in=acked_ids):
                exists = Notification.objects.filter(
                    recipient=user,
                    title__startswith="Policy acknowledgement required:",
                    body__contains=str(policy.id),
                    is_read=False,
                ).exists()
                if not exists:
                    Notification.objects.create(
                        recipient=user,
                        notification_type=Notification.NotificationType.WARNING,
                        title=f"Policy acknowledgement required: {policy.title}",
                        body=(
                            f"Please read and acknowledge the policy '{policy.title}' "
                            f"(v{policy.version}). This is required by your organisation."
                        ),
                    )
                    created += 1
        return Response({"notifications_created": created})


class PolicyAcknowledgementViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Acknowledgements."""

    queryset = PolicyAcknowledgement.objects.select_related("policy", "user")
    serializer_class = PolicyAcknowledgementSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["policy", "user"]
    ordering_fields = ["acknowledged_at"]


class PolicyReviewViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Reviews."""

    queryset = PolicyReview.objects.select_related("policy", "reviewer")
    serializer_class = PolicyReviewSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["policy", "reviewer", "result"]
    ordering_fields = ["review_date", "created_at"]


class PolicyVersionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only version history for Policies."""

    queryset = PolicyVersion.objects.select_related("policy", "approved_by")
    serializer_class = PolicyVersionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["policy"]
    ordering_fields = ["approved_at", "version"]
