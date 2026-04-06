from rest_framework.routers import DefaultRouter

from .views import (
    BusinessImpactAnalysisViewSet,
    ContinuityPlanViewSet,
    ContinuityTestViewSet,
)

router = DefaultRouter()
router.register(r"bias", BusinessImpactAnalysisViewSet, basename="bia")
router.register(r"continuity-plans", ContinuityPlanViewSet, basename="continuity-plan")
router.register(r"continuity-tests", ContinuityTestViewSet, basename="continuity-test")

urlpatterns = router.urls
