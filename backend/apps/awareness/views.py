from rest_framework import viewsets, permissions

from .models import AwarenessProgram, AwarenessContent, AwarenessAssignment
from .serializers import (
    AwarenessProgramSerializer,
    AwarenessContentSerializer,
    AwarenessAssignmentSerializer,
)


class AwarenessProgramViewSet(viewsets.ModelViewSet):
    queryset = AwarenessProgram.objects.all()
    serializer_class = AwarenessProgramSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["is_active", "is_recurring"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "pass_score", "created_at"]


class AwarenessContentViewSet(viewsets.ModelViewSet):
    queryset = AwarenessContent.objects.select_related("program").all()
    serializer_class = AwarenessContentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["program", "content_type"]
    search_fields = ["title", "body", "program__title"]
    ordering_fields = ["program", "order", "estimated_duration_minutes", "created_at"]


class AwarenessAssignmentViewSet(viewsets.ModelViewSet):
    queryset = AwarenessAssignment.objects.select_related(
        "program", "user", "assigned_by"
    ).all()
    serializer_class = AwarenessAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["program", "user", "passed"]
    search_fields = ["user__email", "program__title"]
    ordering_fields = ["due_date", "completed_at", "score", "passed", "created_at"]
