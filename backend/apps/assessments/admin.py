from django.contrib import admin

from .models import AssessmentTemplate, Question, Assessment, AssessmentResponse


@admin.register(AssessmentTemplate)
class AssessmentTemplateAdmin(admin.ModelAdmin):
    list_display = ["title", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["title", "description"]
    ordering = ["title"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        "template",
        "order",
        "question_type",
        "is_required",
        "weight",
    ]
    list_filter = ["question_type", "is_required", "template"]
    search_fields = ["text", "template__title"]
    ordering = ["template", "order"]
    raw_id_fields = ["template"]


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "template",
        "respondent_name",
        "respondent_email",
        "third_party",
        "status",
        "due_date",
        "completed_at",
        "total_score",
    ]
    list_filter = ["status", "template"]
    search_fields = ["title", "respondent_name", "respondent_email"]
    ordering = ["-created_at"]
    date_hierarchy = "due_date"
    raw_id_fields = ["template", "respondent_user", "third_party"]


@admin.register(AssessmentResponse)
class AssessmentResponseAdmin(admin.ModelAdmin):
    list_display = [
        "assessment",
        "question",
        "score",
    ]
    list_filter = ["assessment__status"]
    search_fields = ["answer_text", "assessment__title"]
    raw_id_fields = ["assessment", "question"]
