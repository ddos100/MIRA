"""
ViewSets for the organizations app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import BusinessProcess, BusinessUnit, OrgSettings, OrganizationalIssue, Scope
from .serializers import (
    BusinessProcessSerializer,
    BusinessUnitSerializer,
    OrgSettingsSerializer,
    OrganizationalIssueSerializer,
    ScopeSerializer,
)


class BusinessUnitViewSet(viewsets.ModelViewSet):
    """CRUD for BusinessUnit. Supports search and is_active filtering."""

    queryset = BusinessUnit.objects.all()
    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def org_settings(request):
    """
    GET  /organizations/settings/  – return the singleton OrgSettings.
    PATCH /organizations/settings/ – partially update it.
    """
    settings_obj = OrgSettings.get()
    if request.method == "GET":
        return Response(OrgSettingsSerializer(settings_obj).data)

    serializer = OrgSettingsSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


class BusinessProcessViewSet(viewsets.ModelViewSet):
    """CRUD for BusinessProcess. Supports filtering by unit, owner, and criticality."""

    queryset = BusinessProcess.objects.select_related("business_unit", "owner").all()
    serializer_class = BusinessProcessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["business_unit", "owner", "criticality", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


class ScopeViewSet(viewsets.ModelViewSet):
    """
    CRUD for versioned Scope documents with Maker/Checker workflow.
    Custom actions: submit, approve, reject.
    """

    queryset = Scope.objects.select_related("reviewer", "approver").all()
    serializer_class = ScopeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "workflow_state"]
    search_fields = ["title", "content", "version"]
    ordering_fields = ["created_at", "updated_at", "version"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        scope = self.get_object()
        if scope.workflow_state not in (Scope.WorkflowState.DRAFT, Scope.WorkflowState.REJECTED):
            return Response(
                {"detail": "Only Draft or Rejected scopes can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scope.submit_for_approval(request.user)
        return Response(ScopeSerializer(scope).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        scope = self.get_object()
        if scope.workflow_state != Scope.WorkflowState.SUBMITTED:
            return Response(
                {"detail": "Only submitted scopes can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scope.approve(request.user)
        return Response(ScopeSerializer(scope).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        scope = self.get_object()
        if scope.workflow_state != Scope.WorkflowState.SUBMITTED:
            return Response(
                {"detail": "Only submitted scopes can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "")
        scope.reject(request.user, reason=reason)
        return Response(ScopeSerializer(scope).data)


class OrganizationalIssueViewSet(CsvImportMixin, CsvExportMixin, viewsets.ModelViewSet):
    """CRUD for Organizational Issues (ISO 27001 §4.1/4.2)."""

    queryset = OrganizationalIssue.objects.select_related("owner").prefetch_related("linked_risks").all()
    serializer_class = OrganizationalIssueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["issue_type", "category", "impact_level", "status", "owner"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "title", "due_date"]
    ordering = ["-created_at"]
    csv_import_fields = [
        "title", "description", "issue_type", "category",
        "impact_level", "status", "due_date", "resolution_notes",
    ]
    csv_export_fields = [
        "id", "title", "description", "issue_type", "category",
        "impact_level", "status", "due_date", "resolution_notes",
        "created_at",
    ]
    csv_filename = "organizational_issues"
