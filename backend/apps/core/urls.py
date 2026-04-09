from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AttachmentViewSet,
    AuditLogListView,
    AutomatedActionViewSet,
    CommentViewSet,
    CustomFieldValueViewSet,
    CustomFieldViewSet,
    NotificationListView,
    StatusRuleViewSet,
    TagDetailView,
    TagListCreateView,
    WebhookViewSet,
    health_check,
    list_content_types,
    mark_all_notifications_read,
    mark_notification_read,
)

router = DefaultRouter()
router.register(r"webhooks", WebhookViewSet, basename="webhook")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"custom-fields", CustomFieldViewSet, basename="custom-field")
router.register(
    r"custom-field-values", CustomFieldValueViewSet, basename="custom-field-value"
)
router.register(r"status-rules", StatusRuleViewSet, basename="status-rule")
router.register(r"automated-actions", AutomatedActionViewSet, basename="automated-action")

urlpatterns = router.urls + [
    path("health/", health_check, name="health-check"),
    path("content-types/", list_content_types, name="content-types"),
    path("tags/", TagListCreateView.as_view(), name="tag-list"),
    path("tags/<uuid:pk>/", TagDetailView.as_view(), name="tag-detail"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path(
        "notifications/<uuid:pk>/read/",
        mark_notification_read,
        name="notification-read",
    ),
    path(
        "notifications/read-all/",
        mark_all_notifications_read,
        name="notifications-read-all",
    ),
    path("audit-log/", AuditLogListView.as_view(), name="audit-log-list"),
]
