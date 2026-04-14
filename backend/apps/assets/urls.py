"""
URL configuration for the assets app.
"""

from rest_framework.routers import DefaultRouter

from .views import (
    AssetCategoryViewSet, AssetViewSet, DataAssetViewSet, DataFlowViewSet,
    DataLifecycleStageViewSet, DataLifecycleRequirementViewSet,
)

router = DefaultRouter()
router.register(r"asset-categories", AssetCategoryViewSet, basename="asset-category")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"data-assets", DataAssetViewSet, basename="data-asset")
router.register(r"data-flows", DataFlowViewSet, basename="data-flow")
router.register(r"lifecycle-stages", DataLifecycleStageViewSet, basename="lifecycle-stage")
router.register(r"lifecycle-requirements", DataLifecycleRequirementViewSet, basename="lifecycle-requirement")

urlpatterns = router.urls
