from django.db.models import Count, Q
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
        return Response(DashboardSerializer(new_dash).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set this dashboard as the user's default."""
        dashboard = self.get_object()
        Dashboard.objects.filter(owner=request.user, is_default=True).update(is_default=False)
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
        return Response(ReportExportSerializer(export).data, status=status.HTTP_202_ACCEPTED)


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
