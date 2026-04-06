"""
ViewSets for the organizations app.
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BusinessProcess, BusinessUnit, OrgSettings
from .serializers import BusinessProcessSerializer, BusinessUnitSerializer, OrgSettingsSerializer


class BusinessUnitViewSet(viewsets.ModelViewSet):
    """CRUD for BusinessUnit. Supports search and is_active filtering."""

    queryset = BusinessUnit.objects.all()
    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def org_settings(request):
    """
    GET  /organizations/settings/  – return the singleton OrgSettings.
    PATCH /organizations/settings/ – partially update it.
    """
    settings_obj = OrgSettings.get()
    if request.method == "GET":
        return Response(OrgSettingsSerializer(settings_obj).data)

    serializer = OrgSettingsSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


class BusinessProcessViewSet(viewsets.ModelViewSet):
    """CRUD for BusinessProcess. Supports filtering by unit, owner, and criticality."""

    queryset = BusinessProcess.objects.select_related(
        "business_unit", "owner"
    ).all()
    serializer_class = BusinessProcessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["business_unit", "owner", "criticality", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]
