"""URL configuration for the Incident Management app."""
from rest_framework.routers import DefaultRouter

from .views import IncidentCategoryViewSet, IncidentUpdateViewSet, IncidentViewSet

router = DefaultRouter()
router.register(r"categories", IncidentCategoryViewSet, basename="incident-category")
router.register(r"incidents", IncidentViewSet, basename="incident")
router.register(r"updates", IncidentUpdateViewSet, basename="incident-update")

urlpatterns = router.urls
