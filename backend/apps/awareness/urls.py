from rest_framework.routers import DefaultRouter

from .views import (
    AwarenessAssignmentViewSet,
    AwarenessContentViewSet,
    AwarenessProgramViewSet,
)

router = DefaultRouter()
router.register(
    r"awareness-programs", AwarenessProgramViewSet, basename="awareness-program"
)
router.register(
    r"awareness-contents", AwarenessContentViewSet, basename="awareness-content"
)
router.register(
    r"awareness-assignments",
    AwarenessAssignmentViewSet,
    basename="awareness-assignment",
)

urlpatterns = router.urls
