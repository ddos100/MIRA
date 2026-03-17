"""
URL configuration for the organizations app.
"""
from rest_framework.routers import DefaultRouter

from .views import BusinessProcessViewSet, BusinessUnitViewSet

router = DefaultRouter()
router.register(r"business-units", BusinessUnitViewSet, basename="business-unit")
router.register(r"business-processes", BusinessProcessViewSet, basename="business-process")

urlpatterns = router.urls
