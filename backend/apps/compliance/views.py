"""Views for the Compliance Management app."""
from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
    ComplianceProgram,
    Evidence,
    Requirement,
)
from .serializers import (
    ComplianceAssessmentSerializer,
    ComplianceFrameworkSerializer,
    ComplianceProgramSerializer,
    EvidenceSerializer,
    RequirementSerializer,
)


class ComplianceFrameworkViewSet(viewsets.ModelViewSet):
    """CRUD for Compliance Frameworks."""

    queryset = ComplianceFramework.objects.all()
    serializer_class = ComplianceFrameworkSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "short_name", "issuing_body"]
    ordering_fields = ["name", "created_at"]


class RequirementViewSet(viewsets.ModelViewSet):
    """CRUD for Framework Requirements."""

    queryset = Requirement.objects.select_related("framework", "parent")
    serializer_class = RequirementSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["framework", "parent"]
    search_fields = ["ref_code", "title", "description"]
    ordering_fields = ["order", "ref_code", "created_at"]


class ComplianceProgramViewSet(viewsets.ModelViewSet):
    """CRUD for Compliance Programs, with a gap summary extra action."""

    queryset = ComplianceProgram.objects.select_related("framework", "owner")
    serializer_class = ComplianceProgramSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["framework", "owner", "status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "target_date"]

    @action(detail=True, methods=["get"], url_path="gap-summary")
    def gap_summary(self, request, pk=None):
        """
        Return counts of assessments grouped by compliance status
        for this program, suitable for gap analysis visualisation.
        """
        program = self.get_object()
        counts = (
            program.assessments.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        summary = {entry["status"]: entry["count"] for entry in counts}

        # Ensure every possible status key is present even if count is 0
        for choice in ComplianceAssessment.ComplianceStatus.values:
            summary.setdefault(choice, 0)

        total = sum(summary.values())
        return Response({"program": str(program), "total": total, "by_status": summary})


class ComplianceAssessmentViewSet(viewsets.ModelViewSet):
    """CRUD for Compliance Assessments."""

    queryset = ComplianceAssessment.objects.select_related(
        "program", "requirement", "assessor"
    )
    serializer_class = ComplianceAssessmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["program", "requirement", "status", "assessor"]
    search_fields = ["notes", "requirement__ref_code", "requirement__title"]
    ordering_fields = ["assessment_date", "next_review_date", "created_at"]


class EvidenceViewSet(viewsets.ModelViewSet):
    """CRUD for Evidence items."""

    queryset = Evidence.objects.select_related("assessment", "collected_by")
    serializer_class = EvidenceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["assessment", "collected_by"]
    search_fields = ["title", "description"]
    ordering_fields = ["collected_date", "created_at"]
