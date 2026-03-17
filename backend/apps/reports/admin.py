from django.contrib import admin

from .models import Dashboard, ReportExport, ReportSchedule, SavedReport, Widget


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "is_default", "is_shared", "created_at"]
    list_filter = ["is_default", "is_shared"]
    search_fields = ["name", "owner__email"]


@admin.register(Widget)
class WidgetAdmin(admin.ModelAdmin):
    list_display = ["title", "dashboard", "widget_type", "grid_x", "grid_y"]
    list_filter = ["widget_type"]
    search_fields = ["title", "dashboard__name"]


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ["name", "module", "owner", "is_shared", "created_at"]
    list_filter = ["module", "is_shared"]
    search_fields = ["name", "owner__email"]


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    list_display = ["report", "frequency", "export_format", "is_active", "last_run_at", "next_run_at"]
    list_filter = ["frequency", "export_format", "is_active"]


@admin.register(ReportExport)
class ReportExportAdmin(admin.ModelAdmin):
    list_display = ["report", "export_format", "status", "requested_by", "created_at", "completed_at"]
    list_filter = ["status", "export_format"]
    readonly_fields = ["completed_at", "created_at"]
