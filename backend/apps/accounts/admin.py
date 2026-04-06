from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import APIKey, User, UserInvitation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "created_at",
    ]
    list_filter = ["role", "is_active", "is_mfa_enabled"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]
    readonly_fields = ["last_login", "created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone",
                    "avatar",
                    "bio",
                    "timezone",
                )
            },
        ),
        ("Organisation", {"fields": ("role", "department", "job_title")}),
        ("Security", {"fields": ("is_mfa_enabled", "mfa_enforced")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Timestamps", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "is_active",
        "last_used_at",
        "expires_at",
        "created_at",
    ]
    list_filter = ["is_active"]
    search_fields = ["name", "user__email"]
    readonly_fields = ["key", "last_used_at", "created_at"]


@admin.register(UserInvitation)
class UserInvitationAdmin(admin.ModelAdmin):
    list_display = [
        "email",
        "role",
        "invited_by",
        "is_accepted",
        "expires_at",
        "created_at",
    ]
    list_filter = ["role", "is_accepted"]
    search_fields = ["email"]
    readonly_fields = ["token", "created_at"]
