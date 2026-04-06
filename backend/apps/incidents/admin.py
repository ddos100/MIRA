"""Django admin configuration for the Incident Management app."""

from django.contrib import admin

from .models import Incident, IncidentCategory, IncidentUpdate


@admin.register(IncidentCategory)
class IncidentCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name", "description"]
    ordering = ["name"]


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "severity",
        "status",
        "category",
        "owner",
        "reporter",
        "detected_at",
        "is_data_breach",
        "gdpr_notification_required",
    ]
    list_filter = [
        "status",
        "severity",
        "category",
        "is_data_breach",
        "gdpr_notification_required",
    ]
    search_fields = ["title", "description", "root_cause", "lessons_learned"]
    autocomplete_fields = ["category", "owner", "reporter"]
    filter_horizontal = ["assets_affected", "risks_raised"]
    readonly_fields = [
        "id",
        "contained_at",
        "resolved_at",
        "closed_at",
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        (
            None,
            {
                "fields": [
                    "id",
                    "title",
                    "description",
                    "category",
                    "severity",
                    "status",
                ]
            },
        ),
        ("People", {"fields": ["owner", "reporter"]}),
        (
            "Timeline",
            {
                "fields": [
                    "detected_at",
                    "reported_at",
                    "contained_at",
                    "resolved_at",
                    "closed_at",
                ]
            },
        ),
        (
            "Data & GDPR",
            {
                "fields": [
                    "is_data_breach",
                    "gdpr_notification_required",
                    "gdpr_notification_sent_at",
                ]
            },
        ),
        ("Analysis", {"fields": ["root_cause", "lessons_learned"]}),
        ("Relationships", {"fields": ["assets_affected", "risks_raised"]}),
        (
            "Timestamps",
            {"fields": ["created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]
    ordering = ["-created_at"]


@admin.register(IncidentUpdate)
class IncidentUpdateAdmin(admin.ModelAdmin):
    list_display = ["incident", "created_by", "created_at"]
    search_fields = ["incident__title", "body"]
    autocomplete_fields = ["incident"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]
