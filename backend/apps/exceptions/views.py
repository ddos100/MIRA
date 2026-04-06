"""Views for the Exception Management app."""

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import GRCException
from .serializers import GRCExceptionSerializer


class GRCExceptionViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for GRC Exceptions with approve, reject, CSV export and import."""

    csv_filename = "exceptions"
    csv_export_fields = [
        "id",
        "title",
        "status",
        "exception_type",
        "requester",
        "approver",
        "expiry_date",
        "is_expired",
        "created_at",
    ]
    csv_import_fields = ["title", "exception_type", "justification", "expiry_date"]

    queryset = GRCException.objects.select_related(
        "requester", "approver", "risk", "compliance_requirement", "policy", "control"
    )
    serializer_class = GRCExceptionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "status",
        "exception_type",
        "requester",
        "approver",
        "is_expired",
    ]
    search_fields = ["title", "description", "justification"]
    ordering_fields = ["status", "exception_type", "expiry_date", "created_at"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a pending exception."""
        exception = self.get_object()
        if exception.status != GRCException.ExceptionStatus.PENDING:
            return Response(
                {"detail": "Only pending exceptions can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        exception.status = GRCException.ExceptionStatus.APPROVED
        exception.approver = request.user
        exception.approved_at = timezone.now()
        exception.save(
            update_fields=["status", "approver", "approved_at", "updated_at"]
        )
        serializer = self.get_serializer(exception)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a pending exception."""
        exception = self.get_object()
        if exception.status != GRCException.ExceptionStatus.PENDING:
            return Response(
                {"detail": "Only pending exceptions can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rejection_reason = request.data.get("rejection_reason", "")
        exception.status = GRCException.ExceptionStatus.REJECTED
        exception.approver = request.user
        exception.rejection_reason = rejection_reason
        exception.save(
            update_fields=["status", "approver", "rejection_reason", "updated_at"]
        )
        serializer = self.get_serializer(exception)
        return Response(serializer.data)
