from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AssessmentResponseViewSet,
    AssessmentTemplateViewSet,
    AssessmentViewSet,
    QuestionViewSet,
    portal_assessment_detail,
    portal_assessment_submit,
)

router = DefaultRouter()
router.register(
    r"assessment-templates", AssessmentTemplateViewSet, basename="assessment-template"
)
router.register(r"questions", QuestionViewSet, basename="question")
router.register(r"assessments", AssessmentViewSet, basename="assessment")
router.register(
    r"assessment-responses", AssessmentResponseViewSet, basename="assessment-response"
)

urlpatterns = router.urls + [
    # External portal – no authentication required
    path(
        "portal/<str:token>/", portal_assessment_detail, name="assessment-portal-detail"
    ),
    path(
        "portal/<str:token>/submit/",
        portal_assessment_submit,
        name="assessment-portal-submit",
    ),
]
