"""
Core abstract models shared across the entire MIRA platform.
"""
import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """Abstract base for every MIRA model: UUID pk, timestamps, ownership."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Tag(BaseModel):
    """Global tagging system reusable across all modules."""

    name = models.CharField(max_length=100, unique=True, db_index=True)
    color = models.CharField(max_length=7, default="#6B7280")  # hex colour

    class Meta:
        verbose_name = _("Tag")
        verbose_name_plural = _("Tags")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Comment(BaseModel):
    """Polymorphic comment attachable to any model."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField(db_index=True)
    content_object = GenericForeignKey("content_type", "object_id")

    body = models.TextField()
    is_internal = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return f"Comment by {self.created_by} on {self.content_type}"


class Attachment(BaseModel):
    """File upload attachable to any model."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField(db_index=True)
    content_object = GenericForeignKey("content_type", "object_id")

    file = models.FileField(upload_to="attachments/%Y/%m/%d/")
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)  # bytes
    mime_type = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = _("Attachment")
        verbose_name_plural = _("Attachments")
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return self.filename


class AuditLog(models.Model):
    """Immutable audit trail for every create / update / delete across MIRA."""

    class Action(models.TextChoices):
        CREATE = "create", _("Create")
        UPDATE = "update", _("Update")
        DELETE = "delete", _("Delete")
        VIEW = "view", _("View")
        EXPORT = "export", _("Export")
        LOGIN = "login", _("Login")
        LOGOUT = "logout", _("Logout")

    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    object_id = models.CharField(max_length=255, blank=True, db_index=True)
    object_repr = models.CharField(max_length=500, blank=True)
    changes = models.JSONField(default=dict)  # {"field": [old, new]}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = _("Audit Log")
        verbose_name_plural = _("Audit Logs")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.action} {self.object_repr} by {self.user} at {self.timestamp}"


class Notification(BaseModel):
    """In-app notification record."""

    class NotificationType(models.TextChoices):
        INFO = "info", _("Info")
        WARNING = "warning", _("Warning")
        DANGER = "danger", _("Danger")
        SUCCESS = "success", _("Success")

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Optional link-back to source object
    content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    object_id = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient}"


class CustomField(BaseModel):
    """Runtime-defined extra fields per module object type."""

    class FieldType(models.TextChoices):
        TEXT = "text", _("Text")
        TEXTAREA = "textarea", _("Textarea")
        NUMBER = "number", _("Number")
        DATE = "date", _("Date")
        BOOLEAN = "boolean", _("Boolean")
        SELECT = "select", _("Select")
        MULTI_SELECT = "multi_select", _("Multi-Select")
        URL = "url", _("URL")
        EMAIL = "email", _("Email")

    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="custom_fields"
    )
    name = models.CharField(max_length=100)
    label = models.CharField(max_length=150)
    field_type = models.CharField(max_length=20, choices=FieldType.choices)
    options = models.JSONField(default=list, blank=True)  # for select/multi-select
    is_required = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = _("Custom Field")
        verbose_name_plural = _("Custom Fields")
        ordering = ["content_type", "order"]
        unique_together = [("content_type", "name")]

    def __str__(self):
        return f"{self.content_type} – {self.label}"


class CustomFieldValue(BaseModel):
    """Stores the value of a custom field for a specific object instance."""

    custom_field = models.ForeignKey(
        CustomField, on_delete=models.CASCADE, related_name="values"
    )
    object_id = models.UUIDField(db_index=True)
    value = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = _("Custom Field Value")
        unique_together = [("custom_field", "object_id")]
