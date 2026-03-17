from rest_framework import serializers

from .models import ThirdParty, ThirdPartyReview


class ThirdPartySerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = ThirdParty
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner_id:
            return obj.owner.get_full_name() or obj.owner.email
        return None


class ThirdPartyReviewSerializer(serializers.ModelSerializer):
    third_party_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ThirdPartyReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_third_party_name(self, obj):
        return obj.third_party.name if obj.third_party_id else None

    def get_reviewer_name(self, obj):
        if obj.reviewer_id:
            return obj.reviewer.get_full_name() or obj.reviewer.email
        return None
