"""
Reports & Dashboards models for MIRA GRC.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Dashboard(BaseModel):
    """Configurable dashboard – can be personal or shared."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboards",
    )

    class Meta:
        verbose_name = _("Dashboard")
        ordering = ["-is_default", "name"]

    def __str__(self):
        return self.name


class Widget(BaseModel):
    """A widget on a dashboard."""

    class WidgetType(models.TextChoices):
        COUNTER = "counter", _("Counter")
        PIE_CHART = "pie_chart", _("Pie Chart")
        BAR_CHART = "bar_chart", _("Bar Chart")
        STACKED_BAR = "stacked_bar", _("Stacked Bar Chart")
        LINE_CHART = "line_chart", _("Line Chart")
        HEATMAP = "heatmap", _("Heat Map")
        TABLE = "table", _("Data Table")
        CALENDAR = "calendar", _("Calendar")
        PIVOT = "pivot", _("Pivot Table")
        TEXT = "text", _("Text / Markdown")

    dashboard = models.ForeignKey(
        Dashboard, on_delete=models.CASCADE, related_name="widgets"
    )
    title = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=20, choices=WidgetType.choices)
    # Grid position
    grid_x = models.PositiveSmallIntegerField(default=0)
    grid_y = models.PositiveSmallIntegerField(default=0)
    grid_w = models.PositiveSmallIntegerField(default=4)
    grid_h = models.PositiveSmallIntegerField(default=3)
    # Config: data source, filters, chart settings stored as JSON
    config = models.JSONField(default=dict)

    class Meta:
        verbose_name = _("Widget")
        ordering = ["dashboard", "grid_y", "grid_x"]

    def __str__(self):
        return f"{self.dashboard.name} – {self.title}"


class SavedReport(BaseModel):
    """A saved report definition (module + filters + fields)."""

    class ReportModule(models.TextChoices):
        RISKS = "risks", _("Risks")
        COMPLIANCE = "compliance", _("Compliance")
        CONTROLS = "controls", _("Controls")
        POLICIES = "policies", _("Policies")
        EXCEPTIONS = "exceptions", _("Exceptions")
        INCIDENTS = "incidents", _("Incidents")
        ASSETS = "assets", _("Assets")
        THIRD_PARTIES = "third_parties", _("Third Parties")
        PROJECTS = "projects", _("Projects")
        PRIVACY = "privacy", _("Privacy")
        AWARENESS = "awareness", _("Awareness")

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=30, choices=ReportModule.choices)
    filters = models.JSONField(default=dict)  # DRF filter kwargs
    fields = models.JSONField(default=list)  # selected columns
    ordering = models.CharField(max_length=100, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_reports",
    )
    is_shared = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Saved Report")
        ordering = ["module", "name"]

    def __str__(self):
        return f"{self.get_module_display()} – {self.name}"


class ReportSchedule(BaseModel):
    """Auto-generate and email a report on a recurring schedule."""

    class Frequency(models.TextChoices):
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")

    class ExportFormat(models.TextChoices):
        PDF = "pdf", _("PDF")
        EXCEL = "excel", _("Excel")
        CSV = "csv", _("CSV")

    report = models.ForeignKey(
        SavedReport, on_delete=models.CASCADE, related_name="schedules"
    )
    frequency = models.CharField(max_length=15, choices=Frequency.choices)
    export_format = models.CharField(
        max_length=5, choices=ExportFormat.choices, default=ExportFormat.PDF
    )
    recipients = models.JSONField(default=list)  # list of email addresses
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Report Schedule")
        ordering = ["report", "frequency"]

    def __str__(self):
        return f"{self.report.name} – {self.frequency}"


class ReportExport(BaseModel):
    """Record of a generated report export."""

    class ExportStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        COMPLETED = "completed", _("Completed")
        FAILED = "failed", _("Failed")

    report = models.ForeignKey(
        SavedReport, on_delete=models.CASCADE, related_name="exports"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="report_exports",
    )
    export_format = models.CharField(max_length=5)
    status = models.CharField(
        max_length=15, choices=ExportStatus.choices, default=ExportStatus.PENDING
    )
    file = models.FileField(upload_to="reports/exports/%Y/%m/", null=True, blank=True)
    error_message = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Report Export")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.report.name} export ({self.status})"
