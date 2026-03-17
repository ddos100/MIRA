"""Django admin configuration for the Risk Management app."""
from django.contrib import admin

from .models import Risk, RiskCategory, RiskReview, RiskTreatmentPlan


@admin.register(RiskCategory)
class RiskCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "created_at"]
    search_fields = ["name"]


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "category",
        "owner",
        "status",
        "treatment_type",
        "inherent_score",
        "inherent_rating",
        "residual_score",
        "residual_rating",
        "review_date",
        "created_at",
    ]
    list_filter = ["status", "treatment_type", "category"]
    search_fields = ["title", "description"]
    readonly_fields = ["inherent_score", "residual_score"]
    date_hierarchy = "created_at"
    autocomplete_fields = ["category", "owner"]


@admin.register(RiskTreatmentPlan)
class RiskTreatmentPlanAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "risk",
        "owner",
        "status",
        "due_date",
        "completion_date",
        "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["title", "risk__title"]
    date_hierarchy = "due_date"


@admin.register(RiskReview)
class RiskReviewAdmin(admin.ModelAdmin):
    list_display = [
        "risk",
        "reviewer",
        "review_date",
        "residual_likelihood",
        "residual_impact",
        "created_at",
    ]
    list_filter = ["review_date"]
    search_fields = ["risk__title", "notes"]
    date_hierarchy = "review_date"
