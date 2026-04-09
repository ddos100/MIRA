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


# ─── Dynamic Status Engine ────────────────────────────────────────────────────


class StatusRule(BaseModel):
    """
    Declarative rule that auto-transitions an object's status field
    when all conditions are satisfied.

    conditions format (JSON array of condition objects):
        [
          {"field": "residual_score", "operator": "gte", "value": 15},
          {"field": "treatment_type", "operator": "eq",  "value": "accept"}
        ]

    Supported operators: eq, neq, gt, gte, lt, lte, in, not_in, is_null, is_not_null
    """

    class RuleStatus(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="status_rules",
        help_text="The model this rule applies to.",
    )
    conditions = models.JSONField(
        default=list,
        help_text="List of condition objects [{field, operator, value}].",
    )
    target_status = models.CharField(
        max_length=50,
        help_text="Value to set on the object's 'status' field when all conditions match.",
    )
    rule_status = models.CharField(
        max_length=10,
        choices=RuleStatus.choices,
        default=RuleStatus.ACTIVE,
        db_index=True,
    )
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_affected_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Status Rule")
        verbose_name_plural = _("Status Rules")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} → {self.target_status}"


# ─── Automated Actions ────────────────────────────────────────────────────────


class AutomatedAction(BaseModel):
    """
    An action to fire automatically when a StatusRule transitions records.

    config schema per action_type:
      send_email:
        {"to": ["addr@example.com"], "subject": "...", "body_template": "..."}
      call_webhook:
        {"url": "...", "method": "POST", "headers": {}, "body_template": {...}}
      create_notification:
        {"title": "...", "body": "...", "recipient_type": "all_admins|owner|all_users"}
    """

    class ActionType(models.TextChoices):
        SEND_EMAIL = "send_email", _("Send Email")
        CALL_WEBHOOK = "call_webhook", _("Call API / Webhook")
        CREATE_NOTIFICATION = "create_notification", _("In-App Notification")

    status_rule = models.ForeignKey(
        StatusRule,
        on_delete=models.CASCADE,
        related_name="automated_actions",
    )
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    trigger_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Automated Action")
        verbose_name_plural = _("Automated Actions")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_action_type_display()})"


# ─── Webhooks ─────────────────────────────────────────────────────────────────


class Webhook(BaseModel):
    """Outbound webhook definition for SIEM / third-party integration."""

    name = models.CharField(max_length=200)
    url = models.URLField(max_length=500)
    # List of event strings, e.g. ["risk.created", "incident.created"]
    events = models.JSONField(default=list)
    secret = models.CharField(
        max_length=64,
        blank=True,
        help_text="Optional HMAC-SHA256 secret. Sent as X-MIRA-Signature header.",
    )
    is_active = models.BooleanField(default=True)
    last_delivery_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Webhook")
        verbose_name_plural = _("Webhooks")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} → {self.url}"


# ─── Generic Review (Maker/Checker Workflow) ──────────────────────────────────


class Review(BaseModel):
    """
    Generic review record attachable to any model (Risk, Asset, Control, etc.).
    Implements the Maker/Checker (4-eyes) principle per ISO 27001:2022 §9.1/9.3.

    Reviewer (Maker) creates and submits; Approver (Checker) approves or rejects.
    """

    class ReviewType(models.TextChoices):
        PERIODIC = "periodic", _("Periodic Review")
        TRIGGERED = "triggered", _("Triggered Review")
        AD_HOC = "ad_hoc", _("Ad Hoc")
        AUDIT = "audit", _("Internal Audit")
        MANAGEMENT = "management", _("Management Review")

    class WorkflowState(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SUBMITTED = "submitted", _("Submitted for Approval")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected — Needs Revision")

    class Outcome(models.TextChoices):
        SATISFACTORY = "satisfactory", _("Satisfactory")
        NEEDS_IMPROVEMENT = "needs_improvement", _("Needs Improvement")
        UNSATISFACTORY = "unsatisfactory", _("Unsatisfactory")
        CRITICAL = "critical", _("Critical — Immediate Action Required")

    # Generic relation — links to any model instance
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="reviews"
    )
    object_id = models.UUIDField(db_index=True)
    content_object = GenericForeignKey("content_type", "object_id")

    review_type = models.CharField(
        max_length=20, choices=ReviewType.choices, default=ReviewType.PERIODIC
    )
    review_date = models.DateField()

    # Maker (reviewer who conducts and submits)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reviews_conducted",
        help_text="Maker — person conducting the review",
    )
    # Checker (approver who validates)
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviews_approved",
        help_text="Checker — person approving the review",
    )

    workflow_state = models.CharField(
        max_length=20,
        choices=WorkflowState.choices,
        default=WorkflowState.DRAFT,
        db_index=True,
    )
    outcome = models.CharField(
        max_length=30, choices=Outcome.choices, blank=True
    )

    # Content
    findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    actions_required = models.TextField(blank=True)
    evidence = models.TextField(blank=True, help_text="Evidence references or links")

    next_review_date = models.DateField(null=True, blank=True)

    # Approval audit trail
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Review")
        verbose_name_plural = _("Reviews")
        ordering = ["-review_date"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return f"Review [{self.content_type}] on {self.review_date} — {self.workflow_state}"


class WebhookDelivery(models.Model):
    """Record of a single outbound webhook delivery attempt."""

    class DeliveryStatus(models.TextChoices):
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        PENDING = "pending", _("Pending")

    id = models.BigAutoField(primary_key=True)
    webhook = models.ForeignKey(
        Webhook, on_delete=models.CASCADE, related_name="deliveries"
    )
    event = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(
        max_length=10, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING
    )
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Webhook Delivery")
        verbose_name_plural = _("Webhook Deliveries")
        ordering = ["-attempted_at"]

    def __str__(self):
        return f"{self.webhook.name} [{self.event}] – {self.status}"
