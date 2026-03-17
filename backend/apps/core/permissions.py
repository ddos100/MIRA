"""
MIRA RBAC permission helpers.
"""
from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAdminUser(BasePermission):
    """Grants access only to users with the 'admin' role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.has_role("admin")
        )


class IsRiskManager(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.has_role("risk_manager")
        )


class IsComplianceAnalyst(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.has_role("compliance_analyst")
        )


class IsAuditor(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.has_role("auditor")
        )


class ReadOnly(BasePermission):
    """Allow GET, HEAD, OPTIONS only."""

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        return request.method in self.SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: owner can write, others read-only."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return obj.created_by == request.user
