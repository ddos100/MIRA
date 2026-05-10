"""URL configuration for the Risk Management app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    KeyRiskIndicatorViewSet,
    RiskAppetiteViewSet,
    RiskCategoryViewSet,
    RiskReviewViewSet,
    RiskTreatmentPlanViewSet,
    RiskViewSet,
    risk_heatmap,
)

router = DefaultRouter()
router.register(r"categories", RiskCategoryViewSet, basename="riskcategory")
router.register(
    r"treatment-plans", RiskTreatmentPlanViewSet, basename="risktreatmentplan"
)
router.register(r"reviews", RiskReviewViewSet, basename="riskreview")
router.register(r"appetites", RiskAppetiteViewSet, basename="riskappetite")
router.register(r"kris", KeyRiskIndicatorViewSet, basename="kri")
router.register(r"", RiskViewSet, basename="risk")

urlpatterns = [
    path("heatmap/", risk_heatmap, name="risk-heatmap"),
    path("", include(router.urls)),
]
