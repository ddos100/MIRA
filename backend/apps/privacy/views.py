from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    DPIA,
    ConsentEvent,
    ConsentRecord,
    DataSubjectRequest,
    ProcessingActivity,
)
from .serializers import (
    ConsentEventSerializer,
    ConsentRecordSerializer,
    DataSubjectRequestSerializer,
    DPIASerializer,
    ProcessingActivitySerializer,
)


class ProcessingActivityViewSet(viewsets.ModelViewSet):
    queryset = ProcessingActivity.objects.select_related("owner").prefetch_related("third_party_recipients").all()
    serializer_class = ProcessingActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = [
        "legal_basis",
        "is_active",
        "special_category_data",
        "cross_border_transfer",
    ]
    search_fields = ["name", "description", "purpose", "controller", "processor"]
    ordering_fields = ["name", "legal_basis", "created_at"]


class DPIAViewSet(viewsets.ModelViewSet):
    queryset = DPIA.objects.select_related("processing_activity", "assessor").prefetch_related(
        "privacy_risks__category"
    ).all()
    serializer_class = DPIASerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "residual_risk_level", "dpo_consultation_required"]
    search_fields = ["title", "description", "risk_description"]
    ordering_fields = ["title", "status", "approved_at", "review_date", "created_at"]


class DataSubjectRequestViewSet(viewsets.ModelViewSet):
    queryset = DataSubjectRequest.objects.select_related("handler").all()
    serializer_class = DataSubjectRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["request_type", "status"]
    search_fields = ["data_subject_name", "data_subject_email", "description"]
    ordering_fields = ["deadline", "received_at", "status", "created_at"]


class ConsentRecordViewSet(viewsets.ModelViewSet):
    """
    GDPR Art. 7 — Consent capture, withdrawal and audit trail.
    """

    queryset = ConsentRecord.objects.select_related("processing_activity").prefetch_related("events").all()
    serializer_class = ConsentRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "channel", "processing_activity"]
    search_fields = [
        "data_subject_identifier",
        "data_subject_name",
        "purpose",
        "consent_version",
    ]
    ordering_fields = ["granted_at", "withdrawn_at", "expires_at", "created_at"]

    def list(self, request, *args, **kwargs):
        self._auto_expire_consents()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._auto_expire_consents()
        return super().retrieve(request, *args, **kwargs)

    def _auto_expire_consents(self):
        """Flip granted consents past expires_at to 'expired' and log event."""
        now = timezone.now()
        stale = ConsentRecord.objects.filter(
            status=ConsentRecord.ConsentStatus.GRANTED,
            expires_at__lt=now,
        )
        for consent in stale:
            consent.status = ConsentRecord.ConsentStatus.EXPIRED
            consent.save(update_fields=["status", "updated_at"])
            ConsentEvent.objects.create(
                consent=consent,
                event_type=ConsentEvent.EventType.EXPIRED,
                occurred_at=now,
                actor="system",
                notes="Auto-expired: expires_at elapsed.",
            )

    def perform_create(self, serializer):
        consent = serializer.save(created_by=self.request.user)
        if consent.status == ConsentRecord.ConsentStatus.GRANTED and not consent.granted_at:
            consent.granted_at = timezone.now()
            consent.save(update_fields=["granted_at", "updated_at"])
        ConsentEvent.objects.create(
            consent=consent,
            event_type=ConsentEvent.EventType.GRANTED
            if consent.status == ConsentRecord.ConsentStatus.GRANTED
            else ConsentEvent.EventType.UPDATED,
            actor=str(self.request.user),
            ip_address=consent.ip_address,
        )

    @action(detail=True, methods=["post"], url_path="withdraw")
    def withdraw(self, request, pk=None):
        """Record consent withdrawal (GDPR Art. 7(3))."""
        consent = self.get_object()
        if consent.status == ConsentRecord.ConsentStatus.WITHDRAWN:
            return Response(
                {"detail": "Consent already withdrawn."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "")
        now = timezone.now()
        consent.status = ConsentRecord.ConsentStatus.WITHDRAWN
        consent.withdrawn_at = now
        consent.withdrawal_reason = reason
        consent.save(update_fields=[
            "status", "withdrawn_at", "withdrawal_reason", "updated_at",
        ])
        ConsentEvent.objects.create(
            consent=consent,
            event_type=ConsentEvent.EventType.WITHDRAWN,
            occurred_at=now,
            actor=str(request.user),
            notes=reason,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(ConsentRecordSerializer(consent).data)

    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        consent = self.get_object()
        return Response(ConsentEventSerializer(consent.events.all(), many=True).data)
