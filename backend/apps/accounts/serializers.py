import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.organizations.models import BusinessUnit

from .models import APIKey, UserGroup, UserInvitation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    business_units = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=BusinessUnit.objects.all(),
        required=False,
    )
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "role",
            "department",
            "job_title",
            "phone",
            "avatar",
            "timezone",
            "bio",
            "is_mfa_enabled",
            "is_active",
            "last_login",
            "password_changed_at",
            "created_at",
            "updated_at",
            "business_units",
            "groups",
        ]
        read_only_fields = [
            "id", "last_login", "password_changed_at", "created_at", "updated_at",
        ]

    def update(self, instance, validated_data):
        business_units = validated_data.pop("business_units", None)
        groups = validated_data.pop("groups", None)
        instance = super().update(instance, validated_data)
        if business_units is not None:
            instance.business_units.set(business_units)
        if groups is not None:
            instance.groups.set(groups)
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    business_units = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=BusinessUnit.objects.all(),
        required=False,
    )
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
            "role",
            "department",
            "job_title",
            "phone",
            "timezone",
            "business_units",
            "groups",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        business_units = validated_data.pop("business_units", [])
        groups = validated_data.pop("groups", [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if business_units:
            user.business_units.set(business_units)
        if groups:
            user.groups.set(groups)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        return attrs


class MIRATokenObtainPairSerializer(TokenObtainPairSerializer):
    """Customised JWT with user info embedded."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        token["name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = [
            "id",
            "name",
            "key",
            "is_active",
            "last_used_at",
            "expires_at",
            "created_at",
        ]
        read_only_fields = ["id", "key", "last_used_at", "created_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        validated_data["key"] = secrets.token_hex(32)
        return super().create(validated_data)


class UserInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInvitation
        fields = [
            "id",
            "email",
            "role",
            "invited_by",
            "is_accepted",
            "expires_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "invited_by",
            "is_accepted",
            "expires_at",
            "created_at",
        ]

    def create(self, validated_data):
        from datetime import timedelta

        validated_data["invited_by"] = self.context["request"].user
        validated_data["token"] = secrets.token_hex(32)
        validated_data["expires_at"] = timezone.now() + timedelta(days=7)
        return super().create(validated_data)


class UserGroupSerializer(serializers.ModelSerializer):
    """Serializer for UserGroup (wraps Django Group with metadata)."""

    name = serializers.CharField(source="group.name")
    member_count = serializers.SerializerMethodField()
    member_ids = serializers.SerializerMethodField()

    class Meta:
        model = UserGroup
        fields = [
            "id",
            "name",
            "description",
            "default_role",
            "business_units",
            "member_count",
            "member_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "member_count",
            "member_ids",
        ]

    def get_member_count(self, obj):
        return obj.group.user_set.count()

    def get_member_ids(self, obj):
        return list(obj.group.user_set.values_list("id", flat=True))

    def create(self, validated_data):
        group_data = validated_data.pop("group", {})
        group_name = group_data.get("name")
        business_units = validated_data.pop("business_units", [])
        group, _ = Group.objects.get_or_create(name=group_name)
        user_group = UserGroup.objects.create(group=group, **validated_data)
        if business_units:
            user_group.business_units.set(business_units)
        return user_group

    def update(self, instance, validated_data):
        group_data = validated_data.pop("group", {})
        if "name" in group_data:
            instance.group.name = group_data["name"]
            instance.group.save(update_fields=["name"])
        business_units = validated_data.pop("business_units", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if business_units is not None:
            instance.business_units.set(business_units)
        return instance


class UserGroupMemberSerializer(serializers.Serializer):
    """Used to add/remove users from a group."""

    user_ids = serializers.ListField(child=serializers.UUIDField())
