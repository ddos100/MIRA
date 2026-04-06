from rest_framework import permissions, viewsets

from .models import DPIA, DataSubjectRequest, ProcessingActivity
from .serializers import (
    DataSubjectRequestSerializer,
    DPIASerializer,
    ProcessingActivitySerializer,
)


class ProcessingActivityViewSet(viewsets.ModelViewSet):
    queryset = ProcessingActivity.objects.all()
    serializer_class = ProcessingActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = [
        "legal_basis",
        "is_active",
        "special_category_data",
        "cross_border_transfer",
    ]
    search_fields = ["name", "description", "purpose", "controller", "processor"]
    ordering_fields = ["name", "legal_basis", "created_at"]


class DPIAViewSet(viewsets.ModelViewSet):
    queryset = DPIA.objects.select_related("processing_activity", "assessor").all()
    serializer_class = DPIASerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "residual_risk_level", "dpo_consultation_required"]
    search_fields = ["title", "description", "risk_description"]
    ordering_fields = ["title", "status", "approved_at", "review_date", "created_at"]


class DataSubjectRequestViewSet(viewsets.ModelViewSet):
    queryset = DataSubjectRequest.objects.select_related("handler").all()
    serializer_class = DataSubjectRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["request_type", "status"]
    search_fields = ["data_subject_name", "data_subject_email", "description"]
    ordering_fields = ["deadline", "received_at", "status", "created_at"]
