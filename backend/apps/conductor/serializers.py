"""DRF serializers for MIRA Conductor."""
from rest_framework import serializers
from apps.conductor.models import (
    AiConnector, AiConnectorCredential, AiConnectorRun,
    AiDocument, AiDocumentChunk,
    AiAgentRun, AiAgentStep, AiAgentFinding,
    AiReport, AiReportSection,
)


class AiConnectorCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiConnectorCredential
        fields = ["id", "credential_key", "created_at"]
        # Never serialize encrypted_value


class AiConnectorSerializer(serializers.ModelSerializer):
    credentials = AiConnectorCredentialSerializer(many=True, read_only=True)

    class Meta:
        model = AiConnector
        fields = [
            "id", "name", "description", "connector_type", "config", "is_active",
            "webhook_token", "last_tested_at", "last_test_status", "last_test_message",
            "credentials", "created_at", "updated_at",
        ]
        read_only_fields = ["webhook_token", "last_tested_at", "last_test_status", "last_test_message"]


class AiConnectorRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiConnectorRun
        fields = [
            "id", "connector", "trigger", "status", "records_collected",
            "started_at", "completed_at", "error_message", "result_summary", "created_at",
        ]
        read_only_fields = fields


class AiDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiDocument
        fields = [
            "id", "name", "mime_type", "file_size", "sha256_hash",
            "parse_status", "parsed_at", "parse_error", "chunk_count", "page_count",
            "source_type", "doc_metadata", "created_at", "updated_at",
        ]
        read_only_fields = [
            "sha256_hash", "parse_status", "parsed_at", "parse_error",
            "chunk_count", "page_count", "created_at", "updated_at",
        ]


class AiAgentStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiAgentStep
        fields = [
            "id", "agent_type", "step_number", "action", "tool_used",
            "input_data", "output_data", "duration_ms", "result", "error_detail", "created_at",
        ]


class AiAgentFindingSerializer(serializers.ModelSerializer):
    control_title = serializers.SerializerMethodField()
    run_type = serializers.SerializerMethodField()

    class Meta:
        model = AiAgentFinding
        fields = [
            "id", "run", "run_type", "control", "control_title", "promoted_to_issue",
            "severity", "title", "description", "remediation", "evidence_refs",
            "needs_human_review", "validation_result", "status", "reviewer_notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["run", "control", "promoted_to_issue", "created_at"]

    def get_control_title(self, obj):
        return obj.control.title if obj.control_id else None

    def get_run_type(self, obj):
        return obj.run.run_type if obj.run_id else None


class AiAgentRunListSerializer(serializers.ModelSerializer):
    framework_name = serializers.SerializerMethodField()

    class Meta:
        model = AiAgentRun
        fields = [
            "id", "run_type", "triggered_by", "framework", "framework_name",
            "status", "current_agent", "progress_pct", "started_at", "completed_at",
            "compliance_score", "findings_count", "evidence_collected", "created_at",
        ]

    def get_framework_name(self, obj):
        return obj.framework.name if obj.framework_id else None


class AiAgentRunDetailSerializer(AiAgentRunListSerializer):
    steps = AiAgentStepSerializer(many=True, read_only=True)
    findings = AiAgentFindingSerializer(many=True, read_only=True)
    scope = serializers.JSONField()

    class Meta(AiAgentRunListSerializer.Meta):
        fields = AiAgentRunListSerializer.Meta.fields + [
            "scope", "error_message", "steps", "findings",
        ]


class AiReportSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiReportSection
        fields = ["id", "section_order", "title", "content", "section_data"]


class AiReportSerializer(serializers.ModelSerializer):
    sections = AiReportSectionSerializer(many=True, read_only=True)
    framework_name = serializers.SerializerMethodField()

    class Meta:
        model = AiReport
        fields = [
            "id", "title", "report_type", "run", "framework", "framework_name",
            "status", "generated_at", "compliance_score", "findings_summary",
            "sections", "created_at",
        ]

    def get_framework_name(self, obj):
        return obj.framework.name if obj.framework_id else None


class RunCreateSerializer(serializers.Serializer):
    run_type = serializers.ChoiceField(choices=AiAgentRun.RunType.choices, default="full")
    framework = serializers.UUIDField(required=False, allow_null=True)
    program = serializers.UUIDField(required=False, allow_null=True)


class ConnectorCredentialWriteSerializer(serializers.Serializer):
    """Used when creating/updating connector with credentials."""
    key = serializers.CharField(max_length=128)
    value = serializers.CharField()
