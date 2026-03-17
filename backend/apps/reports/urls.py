from rest_framework.routers import DefaultRouter

from .views import (
    DashboardViewSet,
    ReportExportViewSet,
    ReportScheduleViewSet,
    SavedReportViewSet,
    WidgetViewSet,
)

router = DefaultRouter()
router.register("dashboards", DashboardViewSet, basename="dashboard")
router.register("widgets", WidgetViewSet, basename="widget")
router.register("saved", SavedReportViewSet, basename="saved-report")
router.register("schedules", ReportScheduleViewSet, basename="report-schedule")
router.register("exports", ReportExportViewSet, basename="report-export")

urlpatterns = router.urls
