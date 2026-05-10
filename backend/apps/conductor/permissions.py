"""
Permission classes for MIRA Conductor AI features.
"""
from django.conf import settings
from rest_framework.permissions import BasePermission

CONDUCTOR_ALLOWED_ROLES = {"admin", "risk_manager", "compliance_analyst"}
CONDUCTOR_READ_ROLES = {"admin", "risk_manager", "compliance_analyst", "auditor", "policy_owner", "control_owner"}


class ConductorEnabled(BasePermission):
    """Blocks all Conductor endpoints when CONDUCTOR_ENABLED=False."""
    message = "AI Automation (Conductor) is not enabled on this server. Set CONDUCTOR_ENABLED=true in environment."

    def has_permission(self, request, view):
        return getattr(settings, "CONDUCTOR_ENABLED", False)


class CanRunConductor(BasePermission):
    """Only certain roles may trigger agent runs."""
    message = "You do not have permission to trigger AI agent runs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) in CONDUCTOR_ALLOWED_ROLES or request.user.is_superuser


class CanReadConductor(BasePermission):
    """Broader set of roles can view runs, findings, reports."""
    message = "You do not have permission to view AI Conductor data."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) in CONDUCTOR_READ_ROLES or request.user.is_superuser
