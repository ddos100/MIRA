"""Views for the Risk Management app."""

from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import (
    KeyRiskIndicator,
    KRIMeasurement,
    Risk,
    RiskAppetite,
    RiskCategory,
    RiskReview,
    RiskTreatmentPlan,
)
from .serializers import (
    KeyRiskIndicatorSerializer,
    KRIMeasurementSerializer,
    RiskAppetiteSerializer,
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

    csv_import_fields = [
        "title",
        "status",
        "treatment_type",
        "description",
        "identified_date",
    ]

    csv_filename = "risks"
    csv_export_fields = [
        "id",
        "title",
        "status",
        "category_name",
        "owner_name",
        "inherent_score",
        "inherent_rating",
        "residual_score",
        "residual_rating",
        "treatment_type",
        "identified_date",
        "review_date",
        "created_at",
    ]

    queryset = Risk.objects.select_related(
        "category", "owner", "business_unit"
    ).prefetch_related(
        "assets", "third_parties", "policies", "compliance_requirements",
        "controls", "projects"
    )
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


class RiskAppetiteViewSet(viewsets.ModelViewSet):
    """CRUD for Risk Appetite statements."""

    queryset = RiskAppetite.objects.select_related(
        "category", "business_unit", "owner", "approved_by"
    )
    serializer_class = RiskAppetiteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "business_unit", "approval_status", "owner"]
    search_fields = ["name", "statement"]
    ordering_fields = ["name", "effective_date", "review_date", "created_at"]


class KeyRiskIndicatorViewSet(viewsets.ModelViewSet):
    """CRUD for KRIs with a measurement endpoint."""

    queryset = KeyRiskIndicator.objects.select_related(
        "owner", "business_unit"
    ).prefetch_related("related_risks", "measurements")
    serializer_class = KeyRiskIndicatorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "is_active",
        "owner",
        "business_unit",
        "measurement_frequency",
        "direction",
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "last_measured_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="record")
    def record(self, request, pk=None):
        """Record a new measurement and update current_value."""
        kri = self.get_object()
        value = request.data.get("value")
        note = request.data.get("note", "")
        if value is None:
            return Response(
                {"detail": "value is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            value = float(value)
        except (TypeError, ValueError):
            return Response(
                {"detail": "value must be numeric"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        measurement = KRIMeasurement.objects.create(
            kri=kri, value=value, measured_at=now, note=note
        )
        kri.current_value = value
        kri.last_measured_at = now
        kri.save(update_fields=["current_value", "last_measured_at", "updated_at"])
        return Response(
            KRIMeasurementSerializer(measurement).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="measurements")
    def measurements(self, request, pk=None):
        kri = self.get_object()
        rows = kri.measurements.all()[:200]
        return Response(KRIMeasurementSerializer(rows, many=True).data)


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
