"""Serializers for the Policy Management app."""

from rest_framework import serializers

from .models import Policy, PolicyAcknowledgement, PolicyCategory, PolicyReview


class PolicyCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class PolicySerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None


class PolicyAcknowledgementSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    policy_title = serializers.SerializerMethodField()

    class Meta:
        model = PolicyAcknowledgement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "acknowledged_at"]

    def get_user_name(self, obj):
        if obj.user_id:
            return obj.user.get_full_name() or obj.user.email
        return None

    def get_policy_title(self, obj):
        return obj.policy.title if obj.policy_id else None


class PolicyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
