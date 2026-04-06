from django.contrib import admin

from .models import AwarenessAssignment, AwarenessContent, AwarenessProgram


@admin.register(AwarenessProgram)
class AwarenessProgramAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "is_active",
        "is_recurring",
        "recurrence_months",
        "pass_score",
    ]
    list_filter = ["is_active", "is_recurring"]
    search_fields = ["title", "description"]
    ordering = ["title"]


@admin.register(AwarenessContent)
class AwarenessContentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "program",
        "content_type",
        "order",
        "estimated_duration_minutes",
    ]
    list_filter = ["content_type", "program"]
    search_fields = ["title", "body", "program__title"]
    ordering = ["program", "order"]
    raw_id_fields = ["program"]


@admin.register(AwarenessAssignment)
class AwarenessAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "program",
        "assigned_by",
        "due_date",
        "completed_at",
        "score",
        "passed",
    ]
    list_filter = ["passed", "program"]
    search_fields = ["user__email", "program__title"]
    ordering = ["due_date"]
    date_hierarchy = "due_date"
    raw_id_fields = ["program", "user", "assigned_by"]
