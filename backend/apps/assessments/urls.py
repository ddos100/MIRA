from rest_framework.routers import DefaultRouter

from .views import (
    AssessmentTemplateViewSet,
    QuestionViewSet,
    AssessmentViewSet,
    AssessmentResponseViewSet,
)

router = DefaultRouter()
router.register(r"assessment-templates", AssessmentTemplateViewSet, basename="assessment-template")
router.register(r"questions", QuestionViewSet, basename="question")
router.register(r"assessments", AssessmentViewSet, basename="assessment")
router.register(r"assessment-responses", AssessmentResponseViewSet, basename="assessment-response")

urlpatterns = router.urls
