from rest_framework import serializers

from .models import DPIA, DataSubjectRequest, ProcessingActivity


class ProcessingActivitySerializer(serializers.ModelSerializer):
    owner_detail = serializers.SerializerMethodField(read_only=True)
    third_party_recipients_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProcessingActivity
        fields = [
            "id",
            "name",
            "description",
            "controller",
            "processor",
            "purpose",
            "legal_basis",
            "data_subjects",
            "personal_data_categories",
            "special_category_data",
            "retention_period",
            "third_party_recipients",
            "third_party_recipients_detail",
            "cross_border_transfer",
            "transfer_safeguards",
            "security_measures",
            "owner",
            "owner_detail",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_detail(self, obj):
        if obj.owner_id:
            u = obj.owner
            full_name = f"{u.first_name} {u.last_name}".strip() or u.email
            return {"id": str(u.id), "full_name": full_name, "email": u.email}
        return None

    def get_third_party_recipients_detail(self, obj):
        return [
            {"id": str(tp.id), "name": tp.name}
            for tp in obj.third_party_recipients.all()
        ]


class DPIASerializer(serializers.ModelSerializer):
    processing_activity_detail = serializers.SerializerMethodField(read_only=True)
    assessor_detail = serializers.SerializerMethodField(read_only=True)
    privacy_risks_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DPIA
        fields = [
            "id",
            "processing_activity",
            "processing_activity_detail",
            "title",
            "description",
            "assessor",
            "assessor_detail",
            "status",
            "necessity_assessment",
            "proportionality_assessment",
            "risk_description",
            "mitigation_measures",
            "residual_risk_level",
            "dpo_consultation_required",
            "dpo_consulted_date",
            "dpo_opinion",
            "approved_at",
            "review_date",
            "privacy_risks",
            "privacy_risks_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_processing_activity_detail(self, obj):
        if obj.processing_activity_id:
            return {"id": str(obj.processing_activity.id), "name": obj.processing_activity.name}
        return None

    def get_assessor_detail(self, obj):
        if obj.assessor_id:
            u = obj.assessor
            full_name = f"{u.first_name} {u.last_name}".strip() or u.email
            return {"id": str(u.id), "full_name": full_name, "email": u.email}
        return None

    def get_privacy_risks_detail(self, obj):
        return [
            {
                "id": str(r.id),
                "title": r.title,
                "status": r.status,
                "residual_score": r.residual_score,
                "category_name": r.category.name if r.category_id else None,
            }
            for r in obj.privacy_risks.select_related("category").all()
        ]


class DataSubjectRequestSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = DataSubjectRequest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
