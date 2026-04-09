from rest_framework.routers import DefaultRouter

from .views import ThreatViewSet, ThreatVulnerabilityLinkViewSet, VulnerabilityViewSet

router = DefaultRouter()
router.register(r"vulnerabilities", VulnerabilityViewSet, basename="vulnerability")
router.register(r"links", ThreatVulnerabilityLinkViewSet, basename="threat-vuln-link")
router.register(r"", ThreatViewSet, basename="threat")

urlpatterns = router.urls
