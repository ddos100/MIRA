"""
MIRA RBAC permission helpers.
"""
from rest_framework.permissions import BasePermission, IsAuthenticated


def _has_role(request, *roles):
    return bool(
        request.user
        and request.user.is_authenticated
        and request.user.has_role(*roles)
    )


class IsAdminUser(BasePermission):
    """Grants access only to users with the 'admin' role."""

    def has_permission(self, request, view):
        return _has_role(request, "admin")


class IsRiskManager(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "risk_manager")


class IsRiskReviewer(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "risk_manager", "risk_reviewer")


class IsAssetReviewer(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "asset_reviewer")


class IsComplianceAnalyst(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "compliance_analyst")


class IsAuditor(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "auditor")


class IsAuditOwner(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "auditor", "audit_owner")


class IsControlOwner(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "control_owner")


class IsEvidenceOwner(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "evidence_owner")


class IsPolicyOwner(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "policy_owner")


class IsPolicyApprover(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "admin", "policy_owner", "policy_approver")


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
