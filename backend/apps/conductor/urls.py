"""URL configuration for MIRA Conductor."""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ConductorStatusView,
    AiDocumentViewSet, AiConnectorViewSet,
    AiAgentRunViewSet, AiAgentFindingViewSet,
    AiReportViewSet,
    OllamaHealthView, OllamaModelsView,
    WebhookReceiveView,
)

router = DefaultRouter()
router.register(r"documents", AiDocumentViewSet, basename="ai-document")
router.register(r"connectors", AiConnectorViewSet, basename="ai-connector")
router.register(r"runs", AiAgentRunViewSet, basename="ai-run")
router.register(r"findings", AiAgentFindingViewSet, basename="ai-finding")
router.register(r"reports", AiReportViewSet, basename="ai-report")

urlpatterns = [
    path("status/", ConductorStatusView.as_view(), name="conductor-status"),
    path("ollama/health/", OllamaHealthView.as_view(), name="ollama-health"),
    path("ollama/models/", OllamaModelsView.as_view(), name="ollama-models"),
    path("ollama/models/pull/", OllamaModelsView.as_view(), name="ollama-pull"),
    path("webhooks/receive/<str:token>/", WebhookReceiveView.as_view(), name="webhook-receive"),
] + router.urls
