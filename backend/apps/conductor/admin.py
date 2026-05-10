from django.contrib import admin
from .models import (
    AiConnector, AiConnectorCredential, AiConnectorRun,
    AiDocument, AiDocumentChunk,
    AiAgentRun, AiAgentStep, AiAgentFinding,
    AiReport, AiReportSection,
)


@admin.register(AiConnector)
class AiConnectorAdmin(admin.ModelAdmin):
    list_display = ["name", "connector_type", "is_active", "last_test_status", "last_tested_at"]
    list_filter = ["connector_type", "is_active", "last_test_status"]
    search_fields = ["name", "description"]


@admin.register(AiConnectorRun)
class AiConnectorRunAdmin(admin.ModelAdmin):
    list_display = ["connector", "trigger", "status", "records_collected", "started_at"]
    list_filter = ["status", "trigger"]


@admin.register(AiDocument)
class AiDocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "parse_status", "chunk_count", "page_count", "source_type", "created_at"]
    list_filter = ["parse_status", "source_type"]
    search_fields = ["name"]


@admin.register(AiAgentRun)
class AiAgentRunAdmin(admin.ModelAdmin):
    list_display = ["run_type", "framework", "status", "progress_pct", "compliance_score", "findings_count", "created_at"]
    list_filter = ["status", "run_type", "triggered_by"]
    search_fields = ["framework__name"]


class AiAgentStepInline(admin.TabularInline):
    model = AiAgentStep
    extra = 0
    readonly_fields = ["agent_type", "step_number", "action", "tool_used", "result", "duration_ms"]


class AiAgentFindingInline(admin.TabularInline):
    model = AiAgentFinding
    extra = 0
    readonly_fields = ["severity", "title", "validation_result", "status"]


@admin.register(AiAgentFinding)
class AiAgentFindingAdmin(admin.ModelAdmin):
    list_display = ["severity", "title", "validation_result", "status", "control", "run", "created_at"]
    list_filter = ["severity", "status", "validation_result", "needs_human_review"]
    search_fields = ["title", "description"]


@admin.register(AiReport)
class AiReportAdmin(admin.ModelAdmin):
    list_display = ["title", "report_type", "status", "compliance_score", "generated_at"]
    list_filter = ["report_type", "status"]
