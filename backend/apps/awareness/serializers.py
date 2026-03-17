from rest_framework import serializers

from .models import AwarenessProgram, AwarenessContent, AwarenessAssignment


class AwarenessProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = AwarenessProgram
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AwarenessContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AwarenessContent
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AwarenessAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AwarenessAssignment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
