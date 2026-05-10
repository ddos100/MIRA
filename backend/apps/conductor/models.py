"""
MIRA Conductor – AI agent orchestration models.
AI findings stay separate; users promote to ControlIssues manually.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel


class AiConnector(BaseModel):
    class ConnectorType(models.TextChoices):
        DB = "db", _("Database")
        REST_API = "rest_api", _("REST API")
        SSH = "ssh", _("SSH")
        WEBHOOK = "webhook", _("Inbound Webhook")
        MIRA_API = "mira_api", _("MIRA GRC API")

    class TestStatus(models.TextChoices):
        UNTESTED = "untested", _("Untested")
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    connector_type = models.CharField(max_length=32, choices=ConnectorType.choices)
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    webhook_token = models.CharField(max_length=64, blank=True, db_index=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_status = models.CharField(max_length=16, choices=TestStatus.choices, default=TestStatus.UNTESTED)
    last_test_message = models.TextField(blank=True)

    class Meta:
        verbose_name = _("AI Connector")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.connector_type})"


class AiConnectorCredential(BaseModel):
    connector = models.ForeignKey(AiConnector, on_delete=models.CASCADE, related_name="credentials")
    credential_key = models.CharField(max_length=128)
    encrypted_value = models.TextField()

    class Meta:
        verbose_name = _("AI Connector Credential")
        unique_together = [("connector", "credential_key")]

    def __str__(self):
        return f"{self.connector.name} / {self.credential_key}"


class AiConnectorRun(BaseModel):
    class Trigger(models.TextChoices):
        MANUAL = "manual", _("Manual")
        SCHEDULED = "scheduled", _("Scheduled")
        AGENT = "agent", _("Agent")

    class Status(models.TextChoices):
        RUNNING = "running", _("Running")
        COMPLETED = "completed", _("Completed")
        FAILED = "failed", _("Failed")

    connector = models.ForeignKey(AiConnector, on_delete=models.CASCADE, related_name="runs")
    trigger = models.CharField(max_length=32, choices=Trigger.choices, default=Trigger.MANUAL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.RUNNING)
    records_collected = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    result_summary = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("AI Connector Run")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.connector.name} run @ {self.created_at:%Y-%m-%d %H:%M}"


class AiDocument(BaseModel):
    class ParseStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        DONE = "done", _("Done")
        FAILED = "failed", _("Failed")

    class SourceType(models.TextChoices):
        UPLOAD = "upload", _("Upload")
        CONNECTOR = "connector", _("Connector")
        WEBHOOK = "webhook", _("Webhook")

    name = models.CharField(max_length=512)
    file_path = models.CharField(max_length=1024)
    mime_type = models.CharField(max_length=128, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    sha256_hash = models.CharField(max_length=64, blank=True)
    parse_status = models.CharField(max_length=16, choices=ParseStatus.choices, default=ParseStatus.PENDING, db_index=True)
    parsed_at = models.DateTimeField(null=True, blank=True)
    parse_error = models.TextField(blank=True)
    chunk_count = models.PositiveIntegerField(default=0)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    source_type = models.CharField(max_length=32, choices=SourceType.choices, default=SourceType.UPLOAD)
    doc_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("AI Document")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AiDocumentChunk(BaseModel):
    document = models.ForeignKey(AiDocument, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    chroma_id = models.CharField(max_length=128, blank=True, db_index=True)
    page_number = models.PositiveIntegerField(null=True, blank=True)
    token_count = models.PositiveIntegerField(null=True, blank=True)
    chunk_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("AI Document Chunk")
        ordering = ["chunk_index"]
        unique_together = [("document", "chunk_index")]

    def __str__(self):
        return f"{self.document.name} chunk {self.chunk_index}"


class AiAgentRun(BaseModel):
    class RunType(models.TextChoices):
        FULL = "full", _("Full Pipeline")
        VALIDATE = "validate", _("Validate Only")
        COLLECT = "collect", _("Collect Only")
        REVIEW = "review", _("Review Only")
        REPORT = "report", _("Report Only")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        RUNNING = "running", _("Running")
        COMPLETED = "completed", _("Completed")
        COMPLETED_WITH_WARNINGS = "completed_with_warnings", _("Completed with Warnings")
        FAILED = "failed", _("Failed")
        CANCELLED = "cancelled", _("Cancelled")

    class TriggeredBy(models.TextChoices):
        MANUAL = "manual", _("Manual")
        SCHEDULED = "scheduled", _("Scheduled")
        API = "api", _("API")

    run_type = models.CharField(max_length=32, choices=RunType.choices, default=RunType.FULL)
    scope = models.JSONField(default=dict, blank=True)
    triggered_by = models.CharField(max_length=32, choices=TriggeredBy.choices, default=TriggeredBy.MANUAL)
    framework = models.ForeignKey(
        "compliance.ComplianceFramework", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_runs"
    )
    program = models.ForeignKey(
        "compliance.ComplianceProgram", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_runs"
    )
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING, db_index=True)
    current_agent = models.CharField(max_length=64, blank=True)
    progress_pct = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=128, blank=True)
    compliance_score = models.FloatField(null=True, blank=True)
    findings_count = models.PositiveIntegerField(default=0)
    evidence_collected = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("AI Agent Run")
        ordering = ["-created_at"]

    def __str__(self):
        fw = self.framework.short_code if self.framework_id else "—"
        return f"{self.run_type} / {fw} [{self.status}]"


class AiAgentStep(BaseModel):
    class AgentType(models.TextChoices):
        ORCHESTRATOR = "orchestrator", _("Orchestrator")
        VALIDATOR = "validator", _("Validator")
        COLLECTOR = "collector", _("Collector")
        REVIEWER = "reviewer", _("Reviewer")
        REPORTER = "reporter", _("Reporter")

    class Result(models.TextChoices):
        SUCCESS = "success", _("Success")
        ERROR = "error", _("Error")
        SKIPPED = "skipped", _("Skipped")

    run = models.ForeignKey(AiAgentRun, on_delete=models.CASCADE, related_name="steps")
    agent_type = models.CharField(max_length=32, choices=AgentType.choices)
    step_number = models.PositiveIntegerField()
    action = models.CharField(max_length=255)
    tool_used = models.CharField(max_length=128, blank=True)
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    result = models.CharField(max_length=32, choices=Result.choices, default=Result.SUCCESS)
    error_detail = models.TextField(blank=True)

    class Meta:
        verbose_name = _("AI Agent Step")
        ordering = ["step_number"]

    def __str__(self):
        return f"Step {self.step_number}: {self.action}"


class AiAgentFinding(BaseModel):
    """AI finding — separate from ControlIssues. Promoted manually by users."""

    class Severity(models.TextChoices):
        CRITICAL = "critical", _("Critical")
        HIGH = "high", _("High")
        MEDIUM = "medium", _("Medium")
        LOW = "low", _("Low")
        INFO = "info", _("Info")

    class ValidationResult(models.TextChoices):
        PASS = "pass", _("Pass")
        FAIL = "fail", _("Fail")
        PARTIAL = "partial", _("Partial")
        NOT_TESTED = "not_tested", _("Not Tested")

    class FindingStatus(models.TextChoices):
        OPEN = "open", _("Open")
        PROMOTED = "promoted", _("Promoted to Issue")
        DISMISSED = "dismissed", _("Dismissed")
        ACCEPTED = "accepted", _("Accepted as Risk")

    run = models.ForeignKey(AiAgentRun, on_delete=models.CASCADE, related_name="findings")
    control = models.ForeignKey(
        "controls.Control", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_findings"
    )
    promoted_to_issue = models.ForeignKey(
        "controls.ControlIssue", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_finding_source"
    )
    severity = models.CharField(max_length=16, choices=Severity.choices, default=Severity.MEDIUM, db_index=True)
    title = models.CharField(max_length=512)
    description = models.TextField()
    remediation = models.TextField(blank=True)
    evidence_refs = models.JSONField(default=list, blank=True)
    needs_human_review = models.BooleanField(default=False)
    validation_result = models.CharField(max_length=16, choices=ValidationResult.choices, default=ValidationResult.NOT_TESTED)
    status = models.CharField(max_length=32, choices=FindingStatus.choices, default=FindingStatus.OPEN, db_index=True)
    reviewer_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("AI Agent Finding")
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity}] {self.title}"


class AiReport(BaseModel):
    class ReportType(models.TextChoices):
        EXECUTIVE = "executive", _("Executive Summary")
        AUDIT = "audit", _("Audit Report")
        GAP_ANALYSIS = "gap_analysis", _("Gap Analysis")
        REMEDIATION = "remediation", _("Remediation Roadmap")
        BOARD = "board", _("Board Report")

    class Status(models.TextChoices):
        GENERATING = "generating", _("Generating")
        READY = "ready", _("Ready")
        FAILED = "failed", _("Failed")

    title = models.CharField(max_length=512)
    report_type = models.CharField(max_length=32, choices=ReportType.choices)
    run = models.ForeignKey(AiAgentRun, null=True, blank=True, on_delete=models.SET_NULL, related_name="reports")
    framework = models.ForeignKey(
        "compliance.ComplianceFramework", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_reports"
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.GENERATING)
    generated_at = models.DateTimeField(null=True, blank=True)
    compliance_score = models.FloatField(null=True, blank=True)
    findings_summary = models.JSONField(default=dict, blank=True)
    pdf_path = models.CharField(max_length=1024, blank=True)

    class Meta:
        verbose_name = _("AI Report")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class AiReportSection(BaseModel):
    report = models.ForeignKey(AiReport, on_delete=models.CASCADE, related_name="sections")
    section_order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    section_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("AI Report Section")
        ordering = ["section_order"]

    def __str__(self):
        return f"{self.report.title} / {self.title}"
