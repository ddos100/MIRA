"""Django admin configuration for the Compliance Management app."""
from django.contrib import admin

from .models import (
    ComplianceAssessment,
    ComplianceFramework,
    ComplianceProgram,
    Evidence,
    Requirement,
)


@admin.register(ComplianceFramework)
class ComplianceFrameworkAdmin(admin.ModelAdmin):
    list_display = ["short_name", "name", "version", "issuing_body", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "short_name", "issuing_body"]


@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ["ref_code", "title", "framework", "parent", "order", "created_at"]
    list_filter = ["framework"]
    search_fields = ["ref_code", "title", "description"]
    autocomplete_fields = ["framework", "parent"]
    ordering = ["framework", "order", "ref_code"]


@admin.register(ComplianceProgram)
class ComplianceProgramAdmin(admin.ModelAdmin):
    list_display = ["name", "framework", "owner", "status", "target_date", "created_at"]
    list_filter = ["status", "framework"]
    search_fields = ["name", "description"]
    date_hierarchy = "created_at"
    autocomplete_fields = ["framework", "owner"]


@admin.register(ComplianceAssessment)
class ComplianceAssessmentAdmin(admin.ModelAdmin):
    list_display = [
        "requirement",
        "program",
        "status",
        "assessor",
        "assessment_date",
        "next_review_date",
        "created_at",
    ]
    list_filter = ["status", "program"]
    search_fields = ["requirement__ref_code", "requirement__title", "notes"]
    date_hierarchy = "assessment_date"
    autocomplete_fields = ["program", "requirement", "assessor"]


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "assessment",
        "collected_by",
        "collected_date",
        "created_at",
    ]
    list_filter = ["collected_date"]
    search_fields = ["title", "description"]
    date_hierarchy = "collected_date"
