from django.contrib import admin

from .models import BusinessImpactAnalysis, ContinuityPlan, ContinuityTest


@admin.register(BusinessImpactAnalysis)
class BusinessImpactAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        "business_process",
        "rto_hours",
        "rpo_hours",
        "mtpd_hours",
        "reputational_impact",
        "financial_impact_per_hour",
    ]
    list_filter = ["reputational_impact"]
    search_fields = ["business_process__name", "dependencies", "minimum_resources"]
    raw_id_fields = ["business_process"]


@admin.register(ContinuityPlan)
class ContinuityPlanAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "version",
        "status",
        "owner",
        "approved_at",
        "review_date",
    ]
    list_filter = ["status"]
    search_fields = ["title", "scope", "objectives", "triggers"]
    ordering = ["title"]
    filter_horizontal = ["business_processes"]
    raw_id_fields = ["owner"]


@admin.register(ContinuityTest)
class ContinuityTestAdmin(admin.ModelAdmin):
    list_display = [
        "plan",
        "test_type",
        "test_date",
        "status",
        "lead_tester",
        "rto_achieved_hours",
        "next_test_date",
    ]
    list_filter = ["test_type", "status"]
    search_fields = ["plan__title", "objectives", "result_summary", "issues_found"]
    ordering = ["-test_date"]
    date_hierarchy = "test_date"
    raw_id_fields = ["plan", "lead_tester"]
