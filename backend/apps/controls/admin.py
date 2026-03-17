"""Django admin configuration for the Internal Controls app."""
from django.contrib import admin

from .models import Control, ControlCategory, ControlIssue, ControlTest


@admin.register(ControlCategory)
class ControlCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name", "description"]
    ordering = ["name"]


@admin.register(Control)
class ControlAdmin(admin.ModelAdmin):
    list_display = ["title", "control_type", "frequency", "status", "owner", "category", "version"]
    list_filter = ["status", "control_type", "frequency", "category"]
    search_fields = ["title", "description", "notes"]
    autocomplete_fields = ["owner", "category", "business_unit"]
    filter_horizontal = ["compliance_requirements", "risks"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = [
        (None, {"fields": ["id", "title", "description", "control_type", "frequency", "status", "version"]}),
        ("Ownership", {"fields": ["owner", "category", "business_unit"]}),
        ("Review", {"fields": ["last_review_date", "next_review_date", "notes"]}),
        ("Relationships", {"fields": ["compliance_requirements", "risks"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]


@admin.register(ControlTest)
class ControlTestAdmin(admin.ModelAdmin):
    list_display = ["control", "tester", "test_date", "result", "next_test_date"]
    list_filter = ["result"]
    search_fields = ["control__title", "description", "evidence_description"]
    autocomplete_fields = ["control", "tester"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-test_date"]


@admin.register(ControlIssue)
class ControlIssueAdmin(admin.ModelAdmin):
    list_display = ["title", "severity", "status", "control", "owner", "due_date"]
    list_filter = ["severity", "status"]
    search_fields = ["title", "description", "resolution_notes"]
    autocomplete_fields = ["control", "control_test", "owner"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]
