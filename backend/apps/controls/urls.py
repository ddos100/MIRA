"""URL configuration for the Internal Controls app."""
from rest_framework.routers import DefaultRouter

from .views import ControlCategoryViewSet, ControlIssueViewSet, ControlTestViewSet, ControlViewSet

router = DefaultRouter()
router.register(r"categories", ControlCategoryViewSet, basename="control-category")
router.register(r"controls", ControlViewSet, basename="control")
router.register(r"tests", ControlTestViewSet, basename="control-test")
router.register(r"issues", ControlIssueViewSet, basename="control-issue")

urlpatterns = router.urls
