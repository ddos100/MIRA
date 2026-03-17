from rest_framework import viewsets, permissions

from .models import Project, ProjectTask
from .serializers import ProjectSerializer, ProjectTaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("owner").all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "owner"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "status", "start_date", "end_date", "created_at"]


class ProjectTaskViewSet(viewsets.ModelViewSet):
    queryset = ProjectTask.objects.select_related("project", "assignee").all()
    serializer_class = ProjectTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "status", "priority", "assignee"]
    search_fields = ["title", "description", "project__title"]
    ordering_fields = ["due_date", "priority", "status", "completed_at", "created_at"]
