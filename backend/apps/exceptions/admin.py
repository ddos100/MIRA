"""Django admin configuration for the Exception Management app."""
from django.contrib import admin

from .models import GRCException


@admin.register(GRCException)
class GRCExceptionAdmin(admin.ModelAdmin):
    list_display = [
        "title", "exception_type", "status", "requester", "approver",
        "expiry_date", "is_expired",
    ]
    list_filter = ["status", "exception_type", "is_expired"]
    search_fields = ["title", "description", "justification", "compensating_controls"]
    autocomplete_fields = ["requester", "approver", "risk", "compliance_requirement", "policy", "control"]
    readonly_fields = ["id", "approved_at", "created_at", "updated_at"]
    fieldsets = [
        (None, {"fields": ["id", "title", "description", "exception_type", "status"]}),
        ("Parties", {"fields": ["requester", "approver"]}),
        ("Justification", {"fields": ["justification", "compensating_controls"]}),
        ("Decision", {"fields": ["approved_at", "rejection_reason"]}),
        ("Expiry", {"fields": ["expiry_date", "is_expired"]}),
        ("Linked Objects", {"fields": ["risk", "compliance_requirement", "policy", "control"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]
    ordering = ["-created_at"]
