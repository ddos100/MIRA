from rest_framework import viewsets, permissions

from .models import ThirdParty, ThirdPartyReview
from .serializers import ThirdPartySerializer, ThirdPartyReviewSerializer


class ThirdPartyViewSet(viewsets.ModelViewSet):
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
