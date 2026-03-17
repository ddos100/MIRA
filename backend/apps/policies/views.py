"""Views for the Policy Management app."""
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Policy, PolicyAcknowledgement, PolicyCategory, PolicyReview
from .serializers import (
    PolicyAcknowledgementSerializer,
    PolicyCategorySerializer,
    PolicyReviewSerializer,
    PolicySerializer,
)


class PolicyCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Categories."""

    queryset = PolicyCategory.objects.all()
    serializer_class = PolicyCategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class PolicyViewSet(viewsets.ModelViewSet):
    """CRUD for Policies with filtering, search, and ordering."""

    queryset = Policy.objects.select_related("category", "owner").prefetch_related(
        "compliance_requirements", "controls"
    )
    serializer_class = PolicySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "category", "owner", "acknowledgement_required"]
    search_fields = ["title", "summary", "content"]
    ordering_fields = ["title", "status", "effective_date", "review_date", "created_at"]


class PolicyAcknowledgementViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Acknowledgements."""

    queryset = PolicyAcknowledgement.objects.select_related("policy", "user")
    serializer_class = PolicyAcknowledgementSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["policy", "user"]
    ordering_fields = ["acknowledged_at"]


class PolicyReviewViewSet(viewsets.ModelViewSet):
    """CRUD for Policy Reviews."""

    queryset = PolicyReview.objects.select_related("policy", "reviewer")
    serializer_class = PolicyReviewSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["policy", "reviewer", "result"]
    ordering_fields = ["review_date", "created_at"]
