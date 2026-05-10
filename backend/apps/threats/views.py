from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import Threat, ThreatVulnerabilityLink, Vulnerability
from .serializers import (
    ThreatSerializer,
    ThreatVulnerabilityLinkSerializer,
    VulnerabilitySerializer,
)


class ThreatViewSet(CsvImportMixin, CsvExportMixin, viewsets.ModelViewSet):
    """
    CRUD for Threats. System defaults are read-only templates.
    Filter by ?threat_type=cyber&asset_type=server.
    """

    queryset = Threat.objects.prefetch_related("vulnerability_links").all()
    serializer_class = ThreatSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["threat_type", "source", "is_system_default"]
    search_fields = ["name", "description", "iso27001_clause", "mitre_attack_id"]
    ordering_fields = ["name", "severity", "likelihood", "threat_type", "created_at"]
    csv_import_fields = ["name", "description", "threat_type", "likelihood", "severity", "source", "iso27001_clause", "mitre_attack_id"]
    csv_export_fields = ["id", "name", "description", "threat_type", "likelihood", "severity", "source", "iso27001_clause", "mitre_attack_id", "is_system_default"]
    csv_filename = "threats"

    def get_queryset(self):
        qs = super().get_queryset()
        asset_type = self.request.query_params.get("asset_type")
        if asset_type:
            # Filter where asset_type appears in the asset_types JSON array
            qs = qs.filter(asset_types__contains=asset_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_system_default=False)

    @action(detail=True, methods=["get"], url_path="vulnerabilities")
    def vulnerabilities(self, request, pk=None):
        """Return vulnerabilities linked to this threat."""
        threat = self.get_object()
        vulns = Vulnerability.objects.filter(
            threat_links__threat=threat
        )
        return Response(VulnerabilitySerializer(vulns, many=True).data)


class VulnerabilityViewSet(CsvImportMixin, CsvExportMixin, viewsets.ModelViewSet):
    """
    CRUD for Vulnerabilities.
    Filter by ?vulnerability_type=software&asset_type=server.
    """

    queryset = Vulnerability.objects.prefetch_related("threat_links").all()
    serializer_class = VulnerabilitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["vulnerability_type", "is_system_default"]
    search_fields = ["name", "description", "cve_id", "iso27001_clause"]
    ordering_fields = ["name", "severity", "cvss_score", "vulnerability_type", "created_at"]
    csv_import_fields = ["name", "description", "vulnerability_type", "severity", "cvss_score", "cve_id", "remediation", "iso27001_clause"]
    csv_export_fields = ["id", "name", "description", "vulnerability_type", "severity", "cvss_score", "cve_id", "remediation", "iso27001_clause", "is_system_default"]
    csv_filename = "vulnerabilities"

    def get_queryset(self):
        qs = super().get_queryset()
        asset_type = self.request.query_params.get("asset_type")
        if asset_type:
            qs = qs.filter(asset_types__contains=asset_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_system_default=False)

    @action(detail=True, methods=["get"], url_path="threats")
    def threats(self, request, pk=None):
        """Return threats linked to this vulnerability."""
        vuln = self.get_object()
        threats = Threat.objects.filter(vulnerability_links__vulnerability=vuln)
        return Response(ThreatSerializer(threats, many=True).data)


class ThreatVulnerabilityLinkViewSet(viewsets.ModelViewSet):
    queryset = ThreatVulnerabilityLink.objects.select_related(
        "threat", "vulnerability"
    ).all()
    serializer_class = ThreatVulnerabilityLinkSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["threat", "vulnerability"]
