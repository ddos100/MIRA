from django.urls import path

from .views import (
    AuditLogListView,
    NotificationListView,
    TagDetailView,
    TagListCreateView,
    health_check,
    mark_all_notifications_read,
    mark_notification_read,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("tags/", TagListCreateView.as_view(), name="tag-list"),
    path("tags/<uuid:pk>/", TagDetailView.as_view(), name="tag-detail"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<uuid:pk>/read/", mark_notification_read, name="notification-read"),
    path("notifications/read-all/", mark_all_notifications_read, name="notifications-read-all"),
    path("audit-log/", AuditLogListView.as_view(), name="audit-log-list"),
]
