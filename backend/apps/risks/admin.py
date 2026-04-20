"""Django admin configuration for the Risk Management app."""

from django.contrib import admin

from .models import (
    KeyRiskIndicator,
    KRIMeasurement,
    Risk,
    RiskAppetite,
    RiskCategory,
    RiskReview,
    RiskTreatmentPlan,
)


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


@admin.register(RiskAppetite)
class RiskAppetiteAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "business_unit",
        "max_acceptable_rating",
        "approval_status",
        "effective_date",
        "review_date",
    ]
    list_filter = ["approval_status", "max_acceptable_rating"]
    search_fields = ["name", "statement"]
    autocomplete_fields = ["category", "owner", "approved_by"]


@admin.register(KeyRiskIndicator)
class KeyRiskIndicatorAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "current_value",
        "threshold_amber",
        "threshold_red",
        "direction",
        "measurement_frequency",
        "owner",
        "is_active",
    ]
    list_filter = ["is_active", "direction", "measurement_frequency"]
    search_fields = ["name", "description"]
    filter_horizontal = ["related_risks"]


@admin.register(KRIMeasurement)
class KRIMeasurementAdmin(admin.ModelAdmin):
    list_display = ["kri", "value", "measured_at"]
    list_filter = ["kri"]
    date_hierarchy = "measured_at"
