from django.contrib import admin

from .models import (
    DPIA,
    ConsentEvent,
    ConsentRecord,
    DataSubjectRequest,
    ProcessingActivity,
)


@admin.register(ProcessingActivity)
class ProcessingActivityAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "legal_basis",
        "is_active",
        "special_category_data",
        "cross_border_transfer",
        "owner",
    ]
    list_filter = [
        "legal_basis",
        "is_active",
        "special_category_data",
        "cross_border_transfer",
    ]
    search_fields = ["name", "description", "purpose", "controller", "processor"]
    ordering = ["name"]
    filter_horizontal = ["third_party_recipients"]
    raw_id_fields = ["owner"]


@admin.register(DPIA)
class DPIAAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "processing_activity",
        "status",
        "residual_risk_level",
        "dpo_consultation_required",
        "assessor",
        "approved_at",
        "review_date",
    ]
    list_filter = ["status", "residual_risk_level", "dpo_consultation_required"]
    search_fields = ["title", "description", "risk_description"]
    ordering = ["-created_at"]
    raw_id_fields = ["processing_activity", "assessor"]


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = [
        "data_subject_identifier",
        "purpose",
        "status",
        "channel",
        "granted_at",
        "withdrawn_at",
        "expires_at",
    ]
    list_filter = ["status", "channel"]
    search_fields = [
        "data_subject_identifier",
        "data_subject_name",
        "purpose",
        "consent_version",
    ]
    raw_id_fields = ["processing_activity"]


@admin.register(ConsentEvent)
class ConsentEventAdmin(admin.ModelAdmin):
    list_display = ["consent", "event_type", "actor", "occurred_at", "ip_address"]
    list_filter = ["event_type"]
    search_fields = ["consent__data_subject_identifier", "actor"]
    raw_id_fields = ["consent"]


@admin.register(DataSubjectRequest)
class DataSubjectRequestAdmin(admin.ModelAdmin):
    list_display = [
        "data_subject_name",
        "data_subject_email",
        "request_type",
        "status",
        "received_at",
        "deadline",
        "completed_at",
        "handler",
    ]
    list_filter = ["request_type", "status"]
    search_fields = ["data_subject_name", "data_subject_email", "description"]
    ordering = ["deadline"]
    date_hierarchy = "deadline"
    raw_id_fields = ["handler"]
