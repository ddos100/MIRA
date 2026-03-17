from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogListView,
    NotificationListView,
    TagDetailView,
    TagListCreateView,
    WebhookViewSet,
    health_check,
    mark_all_notifications_read,
    mark_notification_read,
)

router = DefaultRouter()
router.register(r"webhooks", WebhookViewSet, basename="webhook")

urlpatterns = router.urls + [
    path("health/", health_check, name="health-check"),
    path("tags/", TagListCreateView.as_view(), name="tag-list"),
    path("tags/<uuid:pk>/", TagDetailView.as_view(), name="tag-detail"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<uuid:pk>/read/", mark_notification_read, name="notification-read"),
    path("notifications/read-all/", mark_all_notifications_read, name="notifications-read-all"),
    path("audit-log/", AuditLogListView.as_view(), name="audit-log-list"),
]
