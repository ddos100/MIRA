from rest_framework import serializers

from .models import Attachment, AuditLog, Comment, CustomField, CustomFieldValue, Notification, StatusRule, Tag, Webhook, WebhookDelivery


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color"]


class CommentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "body", "is_internal", "created_by", "created_by_name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "filename", "file_size", "mime_type", "description", "created_by", "created_at"]
        read_only_fields = ["id", "filename", "file_size", "mime_type", "created_by", "created_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "timestamp", "user", "user_name", "action", "object_repr", "changes", "ip_address"]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "notification_type", "title", "body", "is_read", "read_at", "created_at"]
        read_only_fields = ["id", "created_at"]


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = ["id", "name", "label", "field_type", "options", "is_required", "order"]


class CustomFieldValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFieldValue
        fields = ["id", "custom_field", "object_id", "value"]


class StatusRuleSerializer(serializers.ModelSerializer):
    content_type_label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StatusRule
        fields = [
            "id", "name", "description", "content_type", "content_type_label",
            "conditions", "target_status", "rule_status",
            "last_run_at", "last_affected_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_run_at", "last_affected_count", "created_at", "updated_at"]

    def get_content_type_label(self, obj):
        if obj.content_type_id:
            return f"{obj.content_type.app_label}.{obj.content_type.model}"
        return None


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = [
            "id", "event", "status", "response_status",
            "response_body", "error_message", "attempted_at",
        ]
        read_only_fields = fields


class WebhookSerializer(serializers.ModelSerializer):
    recent_deliveries = WebhookDeliverySerializer(
        source="deliveries", many=True, read_only=True
    )

    class Meta:
        model = Webhook
        fields = [
            "id", "name", "url", "events", "secret", "is_active",
            "last_delivery_at", "created_at", "updated_at", "recent_deliveries",
        ]
        read_only_fields = ["id", "last_delivery_at", "created_at", "updated_at"]
        extra_kwargs = {"secret": {"write_only": True}}
