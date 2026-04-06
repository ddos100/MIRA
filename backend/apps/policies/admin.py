"""Django admin configuration for the Policy Management app."""

from django.contrib import admin

from .models import Policy, PolicyAcknowledgement, PolicyCategory, PolicyReview


@admin.register(PolicyCategory)
class PolicyCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name", "description"]
    ordering = ["name"]


@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "version",
        "status",
        "owner",
        "category",
        "effective_date",
        "review_date",
        "acknowledgement_required",
    ]
    list_filter = ["status", "category", "acknowledgement_required"]
    search_fields = ["title", "summary", "content"]
    autocomplete_fields = ["owner", "category"]
    filter_horizontal = ["compliance_requirements", "controls"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = [
        (None, {"fields": ["id", "title", "summary", "content", "status", "version"]}),
        ("Ownership & Category", {"fields": ["owner", "category"]}),
        ("Dates", {"fields": ["effective_date", "review_date", "expiry_date"]}),
        (
            "Acknowledgement",
            {"fields": ["acknowledgement_required", "acknowledgement_deadline"]},
        ),
        ("Relationships", {"fields": ["compliance_requirements", "controls"]}),
        (
            "Timestamps",
            {"fields": ["created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]


@admin.register(PolicyAcknowledgement)
class PolicyAcknowledgementAdmin(admin.ModelAdmin):
    list_display = ["policy", "user", "acknowledged_at", "ip_address"]
    list_filter = ["policy"]
    search_fields = ["policy__title", "user__email"]
    autocomplete_fields = ["policy", "user"]
    readonly_fields = ["id", "acknowledged_at", "created_at", "updated_at"]
    ordering = ["-acknowledged_at"]


@admin.register(PolicyReview)
class PolicyReviewAdmin(admin.ModelAdmin):
    list_display = ["policy", "reviewer", "review_date", "result", "next_review_date"]
    list_filter = ["result"]
    search_fields = ["policy__title", "notes"]
    autocomplete_fields = ["policy", "reviewer"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-review_date"]
