"""Serializers for the Internal Controls app."""

from rest_framework import serializers

from .models import Control, ControlCategory, ControlIssue, ControlTest


class ControlCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ControlSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Control
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None


class ControlTestSerializer(serializers.ModelSerializer):
    control_title = serializers.SerializerMethodField()
    tester_name = serializers.SerializerMethodField()

    class Meta:
        model = ControlTest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_control_title(self, obj):
        return obj.control.title if obj.control_id else None

    def get_tester_name(self, obj):
        if obj.tester_id:
            return obj.tester.get_full_name() or obj.tester.email
        return None


class ControlIssueSerializer(serializers.ModelSerializer):
    control_title = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = ControlIssue
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_control_title(self, obj):
        return obj.control.title if obj.control_id else None

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None
