from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1_patterns = [
    path("auth/", include("apps.accounts.urls")),
    path("organizations/", include("apps.organizations.urls")),
    path("assets/", include("apps.assets.urls")),
    path("third-parties/", include("apps.third_parties.urls")),
    path("risks/", include("apps.risks.urls")),
    path("compliance/", include("apps.compliance.urls")),
    path("controls/", include("apps.controls.urls")),
    path("policies/", include("apps.policies.urls")),
    path("exceptions/", include("apps.exceptions.urls")),
    path("incidents/", include("apps.incidents.urls")),
    path("privacy/", include("apps.privacy.urls")),
    path("continuity/", include("apps.continuity.urls")),
    path("projects/", include("apps.projects.urls")),
    path("assessments/", include("apps.assessments.urls")),
    path("awareness/", include("apps.awareness.urls")),
    path("reports/", include("apps.reports.urls")),
    path("core/", include("apps.core.urls")),
    # OpenAPI schema
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1_patterns, "v1"))),
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
