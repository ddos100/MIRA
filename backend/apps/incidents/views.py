"""Views for the Incident Management app."""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import CsvExportMixin

from .models import Incident, IncidentCategory, IncidentUpdate
from .serializers import (
    IncidentCategorySerializer,
    IncidentSerializer,
    IncidentUpdateSerializer,
)


class IncidentCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Incident Categories."""

    queryset = IncidentCategory.objects.all()
    serializer_class = IncidentCategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class IncidentViewSet(CsvExportMixin, viewsets.ModelViewSet):
    """CRUD for Incidents with filtering, search, ordering, and lifecycle actions."""

    csv_filename = "incidents"
    csv_export_fields = [
        "id", "title", "status", "severity", "category_name", "owner_name",
        "detected_at", "contained_at", "resolved_at", "closed_at",
        "is_data_breach", "gdpr_notification_required", "created_at",
    ]

    queryset = Incident.objects.select_related(
        "category", "owner", "reporter"
    ).prefetch_related("assets_affected", "risks_raised")
    serializer_class = IncidentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "status", "severity", "category", "owner", "reporter",
        "is_data_breach", "gdpr_notification_required",
    ]
    search_fields = ["title", "description", "root_cause", "lessons_learned"]
    ordering_fields = ["severity", "status", "detected_at", "created_at"]

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark an incident as resolved."""
        incident = self.get_object()
        if incident.status in (
            Incident.IncidentStatus.RESOLVED,
            Incident.IncidentStatus.CLOSED,
        ):
            return Response(
                {"detail": "Incident is already resolved or closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incident.status = Incident.IncidentStatus.RESOLVED
        incident.resolved_at = timezone.now()
        incident.save(update_fields=["status", "resolved_at", "updated_at"])
        serializer = self.get_serializer(incident)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Close a resolved incident."""
        incident = self.get_object()
        if incident.status == Incident.IncidentStatus.CLOSED:
            return Response(
                {"detail": "Incident is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incident.status = Incident.IncidentStatus.CLOSED
        incident.closed_at = timezone.now()
        incident.save(update_fields=["status", "closed_at", "updated_at"])
        serializer = self.get_serializer(incident)
        return Response(serializer.data)


class IncidentUpdateViewSet(viewsets.ModelViewSet):
    """CRUD for Incident Updates."""

    queryset = IncidentUpdate.objects.select_related("incident")
    serializer_class = IncidentUpdateSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["incident"]
    ordering_fields = ["created_at"]
