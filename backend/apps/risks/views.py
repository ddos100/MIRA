"""Views for the Risk Management app."""
from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import Risk, RiskCategory, RiskReview, RiskTreatmentPlan
from .serializers import (
    RiskCategorySerializer,
    RiskReviewSerializer,
    RiskSerializer,
    RiskTreatmentPlanSerializer,
)


class RiskCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Risk Categories."""

    queryset = RiskCategory.objects.all()
    serializer_class = RiskCategorySerializer


class RiskViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for Risks with filtering, search, ordering, and CSV import."""

    csv_import_fields = ["title", "status", "treatment_type", "description", "identified_date"]

    csv_filename = "risks"
    csv_export_fields = [
        "id", "title", "status", "category_name", "owner_name",
        "inherent_score", "inherent_rating", "residual_score", "residual_rating",
        "treatment_type", "identified_date", "review_date", "created_at",
    ]

    queryset = Risk.objects.select_related(
        "category", "owner", "business_unit"
    ).prefetch_related("assets", "third_parties", "policies", "compliance_requirements", "projects")
    serializer_class = RiskSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "category", "owner", "business_unit"]
    search_fields = ["title", "description"]
    ordering_fields = ["inherent_score", "residual_score", "created_at"]
    ordering = ["-inherent_score"]


class RiskTreatmentPlanViewSet(viewsets.ModelViewSet):
    """CRUD for Risk Treatment Plans."""

    queryset = RiskTreatmentPlan.objects.select_related("risk", "owner")
    serializer_class = RiskTreatmentPlanSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["risk", "status", "owner"]


class RiskReviewViewSet(viewsets.ModelViewSet):
    """CRUD for Risk Reviews."""

    queryset = RiskReview.objects.select_related("risk", "reviewer")
    serializer_class = RiskReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["risk", "reviewer"]


@api_view(["GET"])
def risk_heatmap(request):
    """
    Return risk counts grouped by (inherent_likelihood, inherent_impact)
    for use in a 5x5 heatmap matrix.
    """
    data = (
        Risk.objects.values("inherent_likelihood", "inherent_impact")
        .annotate(count=Count("id"))
        .order_by("inherent_likelihood", "inherent_impact")
    )
    return Response(list(data))
