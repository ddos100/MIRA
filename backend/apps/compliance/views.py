"""Views for the Compliance Management app."""
from django.db import transaction
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import CsvExportMixin

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
    ComplianceFrameworkTemplate,
    ComplianceProgram,
    Evidence,
    Requirement,
)
from .serializers import (
    ComplianceAssessmentSerializer,
    ComplianceFrameworkSerializer,
    ComplianceFrameworkTemplateSerializer,
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


class ComplianceProgramViewSet(CsvExportMixin, viewsets.ModelViewSet):
    """CRUD for Compliance Programs, with a gap summary extra action."""

    csv_filename = "compliance-programs"
    csv_export_fields = [
        "id", "name", "status", "framework_name", "owner_name",
        "requirements_count", "target_date", "created_at",
    ]

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


class ComplianceFrameworkTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for built-in / custom compliance framework templates.
    Use POST /compliance/framework-templates/{id}/instantiate/ to create a
    full ComplianceFramework + Requirement tree from the template.
    """

    queryset = ComplianceFrameworkTemplate.objects.all()
    serializer_class = ComplianceFrameworkTemplateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["template_type", "is_active"]
    search_fields = ["name", "short_name", "description"]
    ordering_fields = ["name", "created_at"]

    @action(detail=True, methods=["post"], url_path="instantiate")
    def instantiate(self, request, pk=None):
        """
        Create a ComplianceFramework + its full Requirement tree from this template.
        Optional body: {"name": "...", "version": "..."}  to override defaults.
        """
        template = self.get_object()
        override_name = request.data.get("name", template.name)
        override_version = request.data.get("version", template.version)

        if ComplianceFramework.objects.filter(
            short_name=template.short_name, version=override_version
        ).exists():
            return Response(
                {"detail": "A framework with this short_name and version already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            framework = ComplianceFramework.objects.create(
                name=override_name,
                short_name=template.short_name,
                version=override_version,
                description=template.description,
                issuing_body=template.issuing_body,
                is_active=True,
            )
            self._create_requirements(framework, template.structure, parent=None)

        return Response(
            ComplianceFrameworkSerializer(framework).data,
            status=status.HTTP_201_CREATED,
        )

    def _create_requirements(self, framework, nodes, parent):
        for node in nodes:
            children = node.pop("children", [])
            req = Requirement.objects.create(
                framework=framework,
                parent=parent,
                ref_code=node.get("ref_code", ""),
                title=node.get("title", ""),
                description=node.get("description", ""),
                guidance=node.get("guidance", ""),
                order=node.get("order", 0),
            )
            if children:
                self._create_requirements(framework, children, parent=req)
