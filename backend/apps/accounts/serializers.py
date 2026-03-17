import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import APIKey, UserInvitation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_login", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

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
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
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
        fields = ["id", "name", "key", "is_active", "last_used_at", "expires_at", "created_at"]
        read_only_fields = ["id", "key", "last_used_at", "created_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        validated_data["key"] = secrets.token_hex(32)
        return super().create(validated_data)


class UserInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInvitation
        fields = ["id", "email", "role", "invited_by", "is_accepted", "expires_at", "created_at"]
        read_only_fields = ["id", "invited_by", "is_accepted", "expires_at", "created_at"]

    def create(self, validated_data):
        from datetime import timedelta

        validated_data["invited_by"] = self.context["request"].user
        validated_data["token"] = secrets.token_hex(32)
        validated_data["expires_at"] = timezone.now() + timedelta(days=7)
        return super().create(validated_data)
