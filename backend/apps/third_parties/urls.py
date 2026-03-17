from rest_framework.routers import DefaultRouter

from .views import ThirdPartyViewSet, ThirdPartyReviewViewSet

router = DefaultRouter()
router.register(r"third-parties", ThirdPartyViewSet, basename="third-party")
router.register(r"third-party-reviews", ThirdPartyReviewViewSet, basename="third-party-review")

urlpatterns = router.urls
