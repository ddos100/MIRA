from rest_framework import serializers

from .models import Project, ProjectTask


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_tasks_count(self, obj):
        return obj.tasks.count()


class ProjectTaskSerializer(serializers.ModelSerializer):
    project_title = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTask
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_project_title(self, obj):
        return obj.project.title if obj.project_id else None

    def get_assignee_name(self, obj):
        if obj.assignee_id:
            return obj.assignee.get_full_name() or obj.assignee.email
        return None
