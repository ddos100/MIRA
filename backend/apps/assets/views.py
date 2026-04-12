"""
ViewSets for the assets app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import Asset, AssetCategory, DataAsset, DataFlow
from .serializers import (
    AssetCategorySerializer,
    AssetSerializer,
    DataAssetSerializer,
    DataFlowSerializer,
)


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for AssetCategory."""

    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


class AssetViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for Asset with rich filtering, search, CSV export and import."""

    csv_filename = "assets"
    csv_export_fields = [
        "id",
        "name",
        "criticality",
        "status",
        "asset_type",
        "owner",
        "business_unit",
        "description",
        "created_at",
    ]
    csv_import_fields = ["name", "criticality", "status", "asset_type", "description"]

    queryset = (
        Asset.objects.select_related("category", "owner", "business_unit")
        .prefetch_related("tags")
        .all()
    )
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "owner", "business_unit", "criticality", "status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


class DataAssetViewSet(viewsets.ModelViewSet):
    """CRUD for DataAsset."""

    queryset = DataAsset.objects.select_related("asset").all()
    serializer_class = DataAssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["classification", "asset"]
    search_fields = ["asset__name", "processing_purpose", "legal_basis"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]


class DataFlowViewSet(viewsets.ModelViewSet):
    """CRUD for DataFlow with filtering by source/destination asset."""

    queryset = DataFlow.objects.select_related(
        "source_asset", "destination_asset", "processing_activity"
    ).all()
    serializer_class = DataFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["source_asset", "destination_asset", "is_cross_border", "lifecycle_stage"]
    search_fields = ["name", "data_types", "transfer_mechanism"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]
