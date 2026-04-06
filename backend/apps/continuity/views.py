from rest_framework import permissions, viewsets

from .models import BusinessImpactAnalysis, ContinuityPlan, ContinuityTest
from .serializers import (
    BusinessImpactAnalysisSerializer,
    ContinuityPlanSerializer,
    ContinuityTestSerializer,
)


class BusinessImpactAnalysisViewSet(viewsets.ModelViewSet):
    queryset = BusinessImpactAnalysis.objects.select_related("business_process").all()
    serializer_class = BusinessImpactAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["reputational_impact"]
    search_fields = ["business_process__name", "dependencies", "minimum_resources"]
    ordering_fields = ["rto_hours", "rpo_hours", "mtpd_hours", "created_at"]


class ContinuityPlanViewSet(viewsets.ModelViewSet):
    queryset = ContinuityPlan.objects.select_related("owner").all()
    serializer_class = ContinuityPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["title", "scope", "objectives", "triggers"]
    ordering_fields = [
        "title",
        "status",
        "version",
        "approved_at",
        "review_date",
        "created_at",
    ]


class ContinuityTestViewSet(viewsets.ModelViewSet):
    queryset = ContinuityTest.objects.select_related("plan", "lead_tester").all()
    serializer_class = ContinuityTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["plan", "test_type", "status"]
    search_fields = ["plan__title", "objectives", "result_summary", "issues_found"]
    ordering_fields = ["test_date", "next_test_date", "status", "created_at"]
