"""
URL configuration for the organizations app.
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BusinessProcessViewSet, BusinessUnitViewSet, org_settings

router = DefaultRouter()
router.register(r"business-units", BusinessUnitViewSet, basename="business-unit")
router.register(r"business-processes", BusinessProcessViewSet, basename="business-process")

urlpatterns = router.urls + [
    path("settings/", org_settings, name="org-settings"),
]
