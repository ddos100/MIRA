from rest_framework import serializers

from .models import AwarenessAssignment, AwarenessContent, AwarenessProgram


class AwarenessProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = AwarenessProgram
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AwarenessContentSerializer(serializers.ModelSerializer):
    program_title = serializers.SerializerMethodField()

    class Meta:
        model = AwarenessContent
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_program_title(self, obj):
        return obj.program.title if obj.program_id else None


class AwarenessAssignmentSerializer(serializers.ModelSerializer):
    program_title = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AwarenessAssignment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_program_title(self, obj):
        return obj.program.title if obj.program_id else None

    def get_user_name(self, obj):
        if obj.user_id:
            return obj.user.get_full_name() or obj.user.email
        return None

    def get_assigned_by_name(self, obj):
        if obj.assigned_by_id:
            return obj.assigned_by.get_full_name() or obj.assigned_by.email
        return None
