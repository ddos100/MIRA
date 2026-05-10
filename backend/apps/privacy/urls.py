from rest_framework.routers import DefaultRouter

from .views import (
    ConsentRecordViewSet,
    DataSubjectRequestViewSet,
    DPIAViewSet,
    ProcessingActivityViewSet,
)

router = DefaultRouter()
router.register(
    r"processing-activities", ProcessingActivityViewSet, basename="processing-activity"
)
router.register(r"dpias", DPIAViewSet, basename="dpia")
router.register(
    r"data-subject-requests", DataSubjectRequestViewSet, basename="data-subject-request"
)
router.register(r"consents", ConsentRecordViewSet, basename="consent")

urlpatterns = router.urls
