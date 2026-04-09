from rest_framework import serializers

from .models import Threat, ThreatVulnerabilityLink, Vulnerability


class ThreatSerializer(serializers.ModelSerializer):
    risk_score = serializers.IntegerField(read_only=True)
    linked_vulnerability_count = serializers.SerializerMethodField()

    class Meta:
        model = Threat
        fields = [
            "id",
            "name",
            "description",
            "threat_type",
            "asset_types",
            "likelihood",
            "severity",
            "risk_score",
            "source",
            "iso27001_clause",
            "mitre_attack_id",
            "is_system_default",
            "linked_vulnerability_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system_default", "created_at", "updated_at"]

    def get_linked_vulnerability_count(self, obj):
        return obj.vulnerability_links.count()


class VulnerabilitySerializer(serializers.ModelSerializer):
    linked_threat_count = serializers.SerializerMethodField()

    class Meta:
        model = Vulnerability
        fields = [
            "id",
            "name",
            "description",
            "vulnerability_type",
            "asset_types",
            "severity",
            "cvss_score",
            "cve_id",
            "remediation",
            "iso27001_clause",
            "is_system_default",
            "linked_threat_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system_default", "created_at", "updated_at"]

    def get_linked_threat_count(self, obj):
        return obj.threat_links.count()


class ThreatVulnerabilityLinkSerializer(serializers.ModelSerializer):
    threat_name = serializers.CharField(source="threat.name", read_only=True)
    vulnerability_name = serializers.CharField(source="vulnerability.name", read_only=True)

    class Meta:
        model = ThreatVulnerabilityLink
        fields = [
            "id",
            "threat",
            "threat_name",
            "vulnerability",
            "vulnerability_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
