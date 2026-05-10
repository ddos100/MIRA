from django.contrib import admin

from .models import (
    Attachment,
    AuditLog,
    Comment,
    CorrectiveActionPlan,
    CustomField,
    Notification,
    Tag,
)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "created_at"]
    search_fields = ["name"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["content_type", "object_id", "created_by", "created_at"]
    list_filter = ["content_type", "is_internal"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["filename", "mime_type", "file_size", "created_by", "created_at"]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action", "object_repr"]
    list_filter = ["action"]
    search_fields = ["object_repr", "user__email"]
    readonly_fields = [
        "timestamp",
        "user",
        "action",
        "content_type",
        "object_id",
        "object_repr",
        "changes",
        "ip_address",
        "user_agent",
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "title", "notification_type", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read"]


@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    list_display = ["label", "content_type", "field_type", "is_required", "order"]
    list_filter = ["content_type", "field_type"]


@admin.register(CorrectiveActionPlan)
class CorrectiveActionPlanAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "severity",
        "status",
        "owner",
        "verifier",
        "target_completion_date",
        "progress_pct",
    ]
    list_filter = ["status", "severity"]
    search_fields = ["title", "description", "root_cause"]
    autocomplete_fields = ["owner", "verifier"]
