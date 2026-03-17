"""URL configuration for the Exception Management app."""
from rest_framework.routers import DefaultRouter

from .views import GRCExceptionViewSet

router = DefaultRouter()
router.register(r"exceptions", GRCExceptionViewSet, basename="grc-exception")

urlpatterns = router.urls
