from rest_framework import serializers

from .models import ThirdParty, ThirdPartyReview


class ThirdPartySerializer(serializers.ModelSerializer):
    class Meta:
        model = ThirdParty
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ThirdPartyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThirdPartyReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
