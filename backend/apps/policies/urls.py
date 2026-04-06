"""URL configuration for the Policy Management app."""

from rest_framework.routers import DefaultRouter

from .views import (
    PolicyAcknowledgementViewSet,
    PolicyCategoryViewSet,
    PolicyReviewViewSet,
    PolicyViewSet,
)

router = DefaultRouter()
router.register(r"categories", PolicyCategoryViewSet, basename="policy-category")
router.register(r"policies", PolicyViewSet, basename="policy")
router.register(
    r"acknowledgements", PolicyAcknowledgementViewSet, basename="policy-acknowledgement"
)
router.register(r"reviews", PolicyReviewViewSet, basename="policy-review")

urlpatterns = router.urls
