from rest_framework import serializers

from .models import Attachment, AuditLog, Comment, CustomField, CustomFieldValue, Notification, Tag


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
