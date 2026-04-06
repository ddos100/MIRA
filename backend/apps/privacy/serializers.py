from rest_framework import serializers

from .models import DPIA, DataSubjectRequest, ProcessingActivity


class ProcessingActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingActivity
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class DPIASerializer(serializers.ModelSerializer):
    class Meta:
        model = DPIA
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class DataSubjectRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSubjectRequest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
