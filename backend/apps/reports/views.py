import importlib

from django.db.models import Avg, Count, Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Dashboard, ReportExport, ReportSchedule, SavedReport, Widget
from .serializers import (
    DashboardListSerializer,
    DashboardSerializer,
    ReportExportSerializer,
    ReportScheduleSerializer,
    SavedReportSerializer,
    WidgetSerializer,
)

# Maps module key → (app_label, ModelClass path)
_WIDGET_MODULE_MAP = {
    "risks": ("apps.risks.models", "Risk"),
    "controls": ("apps.controls.models", "Control"),
    "incidents": ("apps.incidents.models", "Incident"),
    "assets": ("apps.assets.models", "Asset"),
    "policies": ("apps.policies.models", "Policy"),
    "exceptions": ("apps.exceptions.models", "PolicyException"),
    "third_parties": ("apps.third_parties.models", "ThirdParty"),
    "projects": ("apps.projects.models", "Project"),
    "awareness": ("apps.awareness.models", "AwarenessProgram"),
    "compliance": ("apps.compliance.models", "ComplianceProgram"),
}


def _get_model(module_key: str):
    if module_key not in _WIDGET_MODULE_MAP:
        raise ValueError(f"Unknown module: {module_key}")
    module_path, class_name = _WIDGET_MODULE_MAP[module_key]
    mod = importlib.import_module(module_path)
    return getattr(mod, class_name)


def _resolve_widget_data(widget_type: str, config: dict, user) -> dict:
    """
    Resolve live data for a widget from its config dict.

    Expected config keys:
      - module: str (required for data widgets)
      - metric: "count" | "sum" | "avg"
      - field: str (field name for sum/avg)
      - group_by: str (field name to group by)
      - filters: dict (queryset filter kwargs)
      - text: str (for TEXT widgets)
    """
    if widget_type == "text":
        return {"text": config.get("text", "")}

    module_key = config.get("module")
    if not module_key:
        return {"value": 0, "label": "No module configured"}

    Model = _get_model(module_key)
    filters = config.get("filters") or {}
    qs = Model.objects.filter(**filters)

    metric = config.get("metric", "count")
    group_by = config.get("group_by")
    field = config.get("field", "id")

    if group_by:
        # Aggregated data for charts
        if metric == "count":
            rows = qs.values(group_by).annotate(value=Count("id")).order_by(group_by)
        elif metric == "sum":
            rows = qs.values(group_by).annotate(value=Sum(field)).order_by(group_by)
        elif metric == "avg":
            rows = qs.values(group_by).annotate(value=Avg(field)).order_by(group_by)
        else:
            rows = qs.values(group_by).annotate(value=Count("id")).order_by(group_by)

        return {
            "labels": [str(r[group_by]) for r in rows],
            "data": [r["value"] for r in rows],
            "widget_type": widget_type,
        }
    else:
        # Single metric (counter)
        if metric == "count":
            value = qs.count()
        elif metric == "sum":
            value = qs.aggregate(v=Sum(field))["v"] or 0
        elif metric == "avg":
            value = qs.aggregate(v=Avg(field))["v"] or 0
        else:
            value = qs.count()

        return {"value": value, "widget_type": widget_type}


class DashboardViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        return Dashboard.objects.filter(
            Q(owner=user) | Q(is_shared=True)
        ).select_related("owner")

    def get_serializer_class(self):
        if self.action == "list":
            return DashboardListSerializer
        return DashboardSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """Clone a dashboard for the current user."""
        original = self.get_object()
        new_dash = Dashboard.objects.create(
            name=f"Copy of {original.name}",
            description=original.description,
            is_default=False,
            is_shared=False,
            owner=request.user,
            created_by=request.user,
        )
        for widget in original.widgets.all():
            Widget.objects.create(
                dashboard=new_dash,
                title=widget.title,
                widget_type=widget.widget_type,
                grid_x=widget.grid_x,
                grid_y=widget.grid_y,
                grid_w=widget.grid_w,
                grid_h=widget.grid_h,
                config=widget.config,
                created_by=request.user,
            )
        return Response(
            DashboardSerializer(new_dash).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set this dashboard as the user's default."""
        dashboard = self.get_object()
        Dashboard.objects.filter(owner=request.user, is_default=True).update(
            is_default=False
        )
        dashboard.is_default = True
        dashboard.save(update_fields=["is_default"])
        return Response({"status": "ok"})


class WidgetViewSet(viewsets.ModelViewSet):
    serializer_class = WidgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Widget.objects.filter(
            Q(dashboard__owner=self.request.user) | Q(dashboard__is_shared=True)
        )

    @action(detail=True, methods=["get"], url_path="data")
    def data(self, request, pk=None):
        """Resolve live data for this widget based on widget.config."""
        widget = self.get_object()
        config = widget.config or {}
        try:
            result = _resolve_widget_data(widget.widget_type, config, request.user)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class SavedReportViewSet(viewsets.ModelViewSet):
    serializer_class = SavedReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "description"]
    filterset_fields = ["module", "is_shared"]
    ordering_fields = ["name", "module", "created_at"]

    def get_queryset(self):
        user = self.request.user
        return SavedReport.objects.filter(
            Q(owner=user) | Q(is_shared=True)
        ).select_related("owner")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        """Trigger async export of this report."""
        report = self.get_object()
        fmt = request.data.get("format", "pdf")
        export = ReportExport.objects.create(
            report=report,
            requested_by=request.user,
            export_format=fmt,
            created_by=request.user,
        )
        # Trigger celery task
        from .tasks import generate_report_export

        generate_report_export.delay(str(export.id))
        return Response(
            ReportExportSerializer(export).data, status=status.HTTP_202_ACCEPTED
        )


class ReportScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ReportScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["frequency", "is_active"]

    def get_queryset(self):
        return ReportSchedule.objects.filter(report__owner=self.request.user)


class ReportExportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReportExportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "export_format"]
    ordering_fields = ["created_at", "completed_at"]

    def get_queryset(self):
        return ReportExport.objects.filter(requested_by=self.request.user)
