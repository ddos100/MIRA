"""
ViewSets for the organizations app.
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from .models import BusinessProcess, BusinessUnit
from .serializers import BusinessProcessSerializer, BusinessUnitSerializer


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
