from rest_framework import serializers

from .models import Dashboard, ReportExport, ReportSchedule, SavedReport, Widget


class WidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Widget
        fields = [
            "id",
            "dashboard",
            "title",
            "widget_type",
            "grid_x",
            "grid_y",
            "grid_w",
            "grid_h",
            "config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DashboardSerializer(serializers.ModelSerializer):
    widgets = WidgetSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)

    class Meta:
        model = Dashboard
        fields = [
            "id",
            "name",
            "description",
            "is_default",
            "is_shared",
            "owner",
            "owner_name",
            "widgets",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class DashboardListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no widgets)."""

    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)

    class Meta:
        model = Dashboard
        fields = [
            "id",
            "name",
            "description",
            "is_default",
            "is_shared",
            "owner_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SavedReportSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)

    class Meta:
        model = SavedReport
        fields = [
            "id",
            "name",
            "description",
            "module",
            "filters",
            "fields",
            "ordering",
            "owner",
            "owner_name",
            "is_shared",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class ReportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSchedule
        fields = [
            "id",
            "report",
            "frequency",
            "export_format",
            "recipients",
            "is_active",
            "last_run_at",
            "next_run_at",
            "created_at",
        ]
        read_only_fields = ["id", "last_run_at", "next_run_at", "created_at"]


class ReportExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExport
        fields = [
            "id",
            "report",
            "requested_by",
            "export_format",
            "status",
            "file",
            "error_message",
            "completed_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "status",
            "file",
            "error_message",
            "completed_at",
            "created_at",
        ]
