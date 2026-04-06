"""Views for the Internal Controls app."""
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import Control, ControlCategory, ControlIssue, ControlTest
from .serializers import (
    ControlCategorySerializer,
    ControlIssueSerializer,
    ControlSerializer,
    ControlTestSerializer,
)


class ControlCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Control Categories."""

    queryset = ControlCategory.objects.all()
    serializer_class = ControlCategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class ControlViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for Controls with filtering, search, CSV export and import."""

    csv_import_fields = ["title", "control_type", "frequency", "description", "notes"]

    csv_filename = "controls"
    csv_export_fields = [
        "id", "title", "status", "control_type", "frequency",
        "category_name", "owner_name", "last_tested", "next_review_date", "created_at",
    ]

    queryset = Control.objects.select_related(
        "category", "owner", "business_unit"
    ).prefetch_related("compliance_requirements", "risks")
    serializer_class = ControlSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "control_type", "frequency", "category", "owner", "business_unit"]
    search_fields = ["title", "description", "notes"]
    ordering_fields = ["title", "status", "created_at", "next_review_date"]


class ControlTestViewSet(viewsets.ModelViewSet):
    """CRUD for Control Tests."""

    queryset = ControlTest.objects.select_related("control", "tester")
    serializer_class = ControlTestSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["control", "tester", "result"]
    ordering_fields = ["test_date", "created_at"]


class ControlIssueViewSet(viewsets.ModelViewSet):
    """CRUD for Control Issues."""

    queryset = ControlIssue.objects.select_related("control", "control_test", "owner")
    serializer_class = ControlIssueSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["control", "severity", "status", "owner"]
    search_fields = ["title", "description"]
    ordering_fields = ["severity", "status", "due_date", "created_at"]
