from django.contrib import admin

from .models import Project, ProjectTask


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "status",
        "owner",
        "start_date",
        "end_date",
        "budget",
    ]
    list_filter = ["status"]
    search_fields = ["title", "description"]
    ordering = ["-created_at"]
    filter_horizontal = ["risks", "controls", "compliance_programs"]
    raw_id_fields = ["owner"]


@admin.register(ProjectTask)
class ProjectTaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "project",
        "status",
        "priority",
        "assignee",
        "due_date",
        "completed_at",
    ]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description", "project__title"]
    ordering = ["due_date", "priority"]
    date_hierarchy = "due_date"
    raw_id_fields = ["project", "assignee"]
