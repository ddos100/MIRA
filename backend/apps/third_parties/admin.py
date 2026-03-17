from django.contrib import admin

from .models import ThirdParty, ThirdPartyReview


@admin.register(ThirdParty)
class ThirdPartyAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "vendor_type",
        "risk_tier",
        "is_active",
        "owner",
        "contract_start",
        "contract_end",
        "data_shared",
        "processing_personal_data",
    ]
    list_filter = ["vendor_type", "risk_tier", "is_active", "data_shared", "processing_personal_data"]
    search_fields = ["name", "contact_name", "contact_email", "description"]
    ordering = ["name"]
    date_hierarchy = "contract_end"
    raw_id_fields = ["owner"]


@admin.register(ThirdPartyReview)
class ThirdPartyReviewAdmin(admin.ModelAdmin):
    list_display = [
        "third_party",
        "review_date",
        "status",
        "risk_rating",
        "reviewer",
        "next_review_date",
    ]
    list_filter = ["status", "risk_rating"]
    search_fields = ["third_party__name", "findings", "recommendations"]
    ordering = ["-review_date"]
    raw_id_fields = ["third_party", "reviewer"]
