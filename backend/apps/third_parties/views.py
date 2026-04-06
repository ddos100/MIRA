from rest_framework import permissions, viewsets

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import ThirdParty, ThirdPartyReview
from .serializers import ThirdPartyReviewSerializer, ThirdPartySerializer


class ThirdPartyViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    csv_filename = "third-parties"
    csv_export_fields = [
        "id",
        "name",
        "vendor_type",
        "risk_tier",
        "is_active",
        "contact_name",
        "contact_email",
        "contract_start",
        "contract_end",
        "created_at",
    ]
    csv_import_fields = [
        "name",
        "vendor_type",
        "risk_tier",
        "contact_name",
        "contact_email",
    ]

    queryset = ThirdParty.objects.all()
    serializer_class = ThirdPartySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["vendor_type", "risk_tier", "is_active"]
    search_fields = ["name", "contact_name", "contact_email"]
    ordering_fields = ["name", "risk_tier", "contract_end", "created_at"]


class ThirdPartyReviewViewSet(viewsets.ModelViewSet):
    queryset = ThirdPartyReview.objects.select_related("third_party", "reviewer").all()
    serializer_class = ThirdPartyReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["third_party", "status", "risk_rating"]
    search_fields = ["third_party__name", "findings", "recommendations"]
    ordering_fields = ["review_date", "next_review_date", "created_at"]
