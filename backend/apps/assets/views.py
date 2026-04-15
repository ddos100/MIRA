"""
ViewSets for the assets app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import CsvExportMixin, CsvImportMixin

from .models import (
    Asset, AssetCategory, DataAsset, DataFlow,
    DataLifecycleStage, DataLifecycleRequirement,
    STAGE_REQUIREMENTS_TEMPLATE,
)
from .serializers import (
    AssetCategorySerializer,
    AssetSerializer,
    DataAssetSerializer,
    DataFlowSerializer,
    DataLifecycleStageSerializer,
    DataLifecycleRequirementSerializer,
)


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for AssetCategory."""

    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


class AssetViewSet(CsvExportMixin, CsvImportMixin, viewsets.ModelViewSet):
    """CRUD for Asset with rich filtering, search, CSV export and import."""

    csv_filename = "assets"
    csv_export_fields = [
        "id",
        "name",
        "criticality",
        "status",
        "asset_type",
        "owner",
        "business_unit",
        "description",
        "created_at",
    ]
    csv_import_fields = ["name", "criticality", "status", "asset_type", "description"]

    queryset = (
        Asset.objects.select_related("category", "owner", "business_unit")
        .prefetch_related("tags")
        .all()
    )
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "owner", "business_unit", "criticality", "status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]


class DataAssetViewSet(viewsets.ModelViewSet):
    """CRUD for DataAsset."""

    queryset = DataAsset.objects.select_related("asset").all()
    serializer_class = DataAssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["classification", "asset"]
    search_fields = ["asset__name", "processing_purpose", "legal_basis"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]


class DataFlowViewSet(viewsets.ModelViewSet):
    """CRUD for DataFlow with filtering by source/destination asset."""

    queryset = DataFlow.objects.select_related(
        "source_asset", "destination_asset", "processing_activity"
    ).all()
    serializer_class = DataFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["source_asset", "destination_asset", "is_cross_border", "lifecycle_stage", "processing_activity"]
    search_fields = ["name", "data_types", "transfer_mechanism"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["name"]

    # ── Legal-basis mapping: GDPR free-text → PA enum ────────────────────────
    _LEGAL_BASIS_MAP = {
        "consent":              "consent",
        "contract":             "contract",
        "legal obligation":     "legal_obligation",
        "vital interests":      "vital_interests",
        "public task":          "public_task",
        "legitimate interests": "legitimate_interests",
    }

    def _sync_to_processing_activity(self, data_flow):
        """
        One-way, non-destructive sync: push DataFlow fields into the linked
        ProcessingActivity only when the PA field is currently blank/false.
        This keeps the RoPA up-to-date automatically as data flows are added.
        """
        if not data_flow.processing_activity_id:
            return
        pa = data_flow.processing_activity
        updated = []

        if data_flow.personal_data_categories and not pa.personal_data_categories:
            pa.personal_data_categories = data_flow.personal_data_categories
            updated.append("personal_data_categories")

        if data_flow.data_subject_categories and not pa.data_subjects:
            pa.data_subjects = data_flow.data_subject_categories
            updated.append("data_subjects")

        if data_flow.is_cross_border and not pa.cross_border_transfer:
            pa.cross_border_transfer = True
            updated.append("cross_border_transfer")

        if data_flow.special_category_data and not pa.special_category_data:
            pa.special_category_data = True
            updated.append("special_category_data")

        if data_flow.transfer_safeguards and not pa.transfer_safeguards:
            pa.transfer_safeguards = data_flow.transfer_safeguards
            updated.append("transfer_safeguards")

        if data_flow.retention_period_days and not pa.retention_period:
            pa.retention_period = f"{data_flow.retention_period_days} days"
            updated.append("retention_period")

        if data_flow.legal_basis:
            lb_lower = data_flow.legal_basis.lower()
            for key, value in self._LEGAL_BASIS_MAP.items():
                if key in lb_lower:
                    pa.legal_basis = value
                    updated.append("legal_basis")
                    break

        if updated:
            pa.save(update_fields=updated)

    @staticmethod
    def _create_ropa(data_flow):
        """
        Auto-create a new ProcessingActivity (RoPA entry) from a DataFlow.
        Called when a DataFlow is saved with no processing_activity set.
        Returns the newly created ProcessingActivity.
        """
        from apps.privacy.models import ProcessingActivity

        _basis_map = {
            "consent":              "consent",
            "contract":             "contract",
            "legal obligation":     "legal_obligation",
            "vital interests":      "vital_interests",
            "public task":          "public_task",
            "legitimate interests": "legitimate_interests",
        }
        legal_basis = "legitimate_interests"
        if data_flow.legal_basis:
            for key, value in _basis_map.items():
                if key in data_flow.legal_basis.lower():
                    legal_basis = value
                    break

        return ProcessingActivity.objects.create(
            name=f"Processing Activity – {data_flow.name}",
            description=(
                f"Auto-generated RoPA entry from data flow '{data_flow.name}'.\n"
                f"Source: {getattr(data_flow.source_asset, 'name', '')} → "
                f"Destination: {getattr(data_flow.destination_asset, 'name', '')}"
            ),
            purpose=data_flow.data_types or f"Data processing for {data_flow.name}",
            legal_basis=legal_basis,
            data_subjects=data_flow.data_subject_categories or "",
            personal_data_categories=data_flow.personal_data_categories or "",
            special_category_data=data_flow.special_category_data,
            retention_period=(
                f"{data_flow.retention_period_days} days"
                if data_flow.retention_period_days else ""
            ),
            cross_border_transfer=data_flow.is_cross_border,
            transfer_safeguards=data_flow.transfer_safeguards or "",
            is_active=True,
        )

    def perform_create(self, serializer):
        data_flow = serializer.save()
        if not data_flow.processing_activity_id:
            # No RoPA linked → create one automatically and attach it
            pa = self._create_ropa(data_flow)
            data_flow.processing_activity = pa
            data_flow.save(update_fields=["processing_activity"])
        else:
            self._sync_to_processing_activity(data_flow)

    def perform_update(self, serializer):
        data_flow = serializer.save()
        self._sync_to_processing_activity(data_flow)


def _get_or_create_privacy_risk_category():
    from apps.risks.models import RiskCategory
    cat, _ = RiskCategory.objects.get_or_create(
        name="Privacy",
        defaults={"description": "Risks arising from privacy / data-protection non-compliance.", "color": "#8B5CF6"},
    )
    return cat


class DataLifecycleStageViewSet(viewsets.ModelViewSet):
    """
    CRUD for DataLifecycleStage.
    On create, the GDPR + DPDPA requirements for the given stage are auto-populated.
    """
    queryset = DataLifecycleStage.objects.select_related(
        "data_flow", "processing_activity", "owner"
    ).prefetch_related("requirements").all()
    serializer_class = DataLifecycleStageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["data_flow", "stage", "compliance_status", "is_cross_border", "special_category_data"]
    search_fields = ["purpose", "notes", "third_party_name"]
    ordering_fields = ["stage", "compliance_status", "created_at"]
    ordering = ["stage"]

    def perform_create(self, serializer):
        stage_record = serializer.save()
        # Auto-populate requirements from template
        template = STAGE_REQUIREMENTS_TEMPLATE.get(stage_record.stage, [])
        DataLifecycleRequirement.objects.bulk_create([
            DataLifecycleRequirement(
                stage_record=stage_record,
                framework=item["framework"],
                requirement_key=item["key"],
                requirement_label=item["label"],
                article_reference=item["reference"],
            )
            for item in template
        ])

    @action(detail=True, methods=["get"])
    def requirements(self, request, pk=None):
        stage = self.get_object()
        serializer = DataLifecycleRequirementSerializer(
            stage.requirements.all(), many=True
        )
        return Response(serializer.data)


class DataLifecycleRequirementViewSet(viewsets.ModelViewSet):
    """
    CRUD for individual compliance items.
    On PATCH/PUT, if rating becomes 'not_met' a Privacy Risk is auto-created.
    """
    queryset = DataLifecycleRequirement.objects.select_related(
        "stage_record__data_flow", "privacy_risk"
    ).all()
    serializer_class = DataLifecycleRequirementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["stage_record", "framework", "rating"]
    search_fields = ["requirement_label", "notes"]
    ordering = ["framework", "requirement_key"]

    def _maybe_create_privacy_risk(self, requirement):
        """Auto-create a Risk when a requirement is rated not_met and replicate to DPIAs."""
        from apps.risks.models import Risk
        if requirement.rating == DataLifecycleRequirement.Rating.NOT_MET and not requirement.privacy_risk_id:
            stage = requirement.stage_record
            cat = _get_or_create_privacy_risk_category()
            risk = Risk.objects.create(
                title=f"Privacy: {requirement.requirement_label} ({stage.data_flow.name} – {stage.get_stage_display()})",
                description=(
                    f"Compliance requirement '{requirement.requirement_label}' "
                    f"({requirement.article_reference}) rated Not Met for lifecycle stage "
                    f"'{stage.get_stage_display()}' of data flow '{stage.data_flow.name}'.\n\n"
                    f"Framework: {requirement.get_framework_display()}"
                ),
                category=cat,
                inherent_likelihood=3,
                inherent_impact=3,
                inherent_score=9,
                residual_likelihood=3,
                residual_impact=3,
                residual_score=9,
            )
            requirement.privacy_risk = risk
            requirement.save(update_fields=["privacy_risk"])

            # Replicate to DPIAs linked via the data flow's processing activity
            self._link_risk_to_dpias(risk, stage)

        elif requirement.rating != DataLifecycleRequirement.Rating.NOT_MET and requirement.privacy_risk_id:
            # If re-rated away from not_met, close the risk
            risk = requirement.privacy_risk
            from apps.risks.models import Risk as RiskModel
            risk.status = RiskModel.Status.CLOSED
            risk.save(update_fields=["status"])

    @staticmethod
    def _link_risk_to_dpias(risk, stage):
        """
        Add the risk to all DPIAs linked via the data flow's processing activity.
        If no DPIA exists, auto-create one. Then re-derive residual_risk_level
        from the worst risk score.
        """
        processing_activity_id = stage.data_flow.processing_activity_id
        if not processing_activity_id:
            return
        from apps.privacy.models import DPIA
        dpias = list(DPIA.objects.filter(processing_activity_id=processing_activity_id))
        if not dpias:
            # Auto-create a new DPIA for this processing activity
            pa = stage.data_flow.processing_activity
            dpia = DPIA.objects.create(
                processing_activity=pa,
                title=f"DPIA \u2013 {pa.name}",
                description=(
                    f"Auto-generated DPIA for processing activity '{pa.name}'.\n"
                    f"Created because a privacy compliance requirement was rated Not Met "
                    f"for data flow '{stage.data_flow.name}'."
                ),
                risk_description=risk.description,
                status="draft",
            )
            dpias = [dpia]
        for dpia in dpias:
            dpia.privacy_risks.add(risk)
            # Derive residual_risk_level from the worst (max) risk score
            max_score = max(
                (r.residual_score for r in dpia.privacy_risks.all()),
                default=0,
            )
            level = (
                "very_high" if max_score >= 16 else
                "high"      if max_score >= 9  else
                "medium"    if max_score >= 4  else
                "low"       if max_score >= 1  else
                None
            )
            if level is not None and dpia.residual_risk_level != level:
                dpia.residual_risk_level = level
                dpia.save(update_fields=["residual_risk_level"])

    def perform_update(self, serializer):
        requirement = serializer.save()
        self._maybe_create_privacy_risk(requirement)
        # Recompute overall stage compliance
        requirement.stage_record.recompute_compliance_status()
