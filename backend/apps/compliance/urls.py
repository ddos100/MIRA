"""URL configuration for the Compliance Management app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ComplianceAssessmentViewSet,
    ComplianceFrameworkTemplateViewSet,
    ComplianceFrameworkViewSet,
    ComplianceProgramViewSet,
    EvidenceViewSet,
    RequirementViewSet,
)

router = DefaultRouter()
router.register(
    r"frameworks", ComplianceFrameworkViewSet, basename="complianceframework"
)
router.register(
    r"framework-templates",
    ComplianceFrameworkTemplateViewSet,
    basename="frameworktemplate",
)
router.register(r"requirements", RequirementViewSet, basename="requirement")
router.register(r"programs", ComplianceProgramViewSet, basename="complianceprogram")
router.register(
    r"assessments", ComplianceAssessmentViewSet, basename="complianceassessment"
)
router.register(r"evidence", EvidenceViewSet, basename="evidence")

urlpatterns = [
    path("", include(router.urls)),
]
