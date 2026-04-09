from rest_framework.routers import DefaultRouter

from .views import (
    GoalAuditScheduleViewSet,
    GoalCategoryViewSet,
    GoalReviewViewSet,
    GoalViewSet,
)

router = DefaultRouter()
router.register(r"categories", GoalCategoryViewSet, basename="goal-category")
router.register(r"reviews", GoalReviewViewSet, basename="goal-review")
router.register(r"audit-schedules", GoalAuditScheduleViewSet, basename="goal-audit-schedule")
router.register(r"", GoalViewSet, basename="goal")

urlpatterns = router.urls
