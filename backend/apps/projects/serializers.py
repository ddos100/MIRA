from rest_framework import serializers

from .models import Project, ProjectTask


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTask
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
