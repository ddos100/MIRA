"""
DRF views for MIRA Conductor AI automation.
All views require ConductorEnabled permission (CONDUCTOR_ENABLED=True in settings).
"""
import asyncio
import hashlib
import json
import logging
import os
import secrets
import uuid
from pathlib import Path

from django.conf import settings
from django.http import StreamingHttpResponse, FileResponse, Http404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.conductor.models import (
    AiConnector, AiConnectorCredential, AiConnectorRun,
    AiDocument, AiAgentRun, AiAgentFinding, AiReport,
)
from apps.conductor.permissions import ConductorEnabled, CanRunConductor, CanReadConductor
from apps.conductor.serializers import (
    AiConnectorSerializer, AiConnectorRunSerializer,
    AiDocumentSerializer, AiAgentRunListSerializer, AiAgentRunDetailSerializer,
    AiAgentFindingSerializer, AiReportSerializer, RunCreateSerializer,
)
from apps.conductor.services.connector_factory import build_connector
from apps.conductor.services.crypto_service import encrypt

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(settings.MEDIA_ROOT) / "conductor" / "documents"
MAX_FILE_MB = getattr(settings, "CONDUCTOR_MAX_FILE_SIZE_MB", 50)


# ─── Status Endpoint ──────────────────────────────────────────────────────────

class ConductorStatusView(APIView):
    permission_classes = []  # Public — used by frontend to conditionally show UI

    def get(self, request):
        enabled = getattr(settings, "CONDUCTOR_ENABLED", False)
        ollama_healthy = False
        if enabled:
            try:
                loop = asyncio.new_event_loop()
                from apps.conductor.llm.ollama_client import get_ollama
                ollama_healthy = loop.run_until_complete(get_ollama().health())
                loop.close()
            except Exception:
                pass
        return Response({"enabled": enabled, "ollama_healthy": ollama_healthy})


# ─── Documents ────────────────────────────────────────────────────────────────

class AiDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [ConductorEnabled, CanReadConductor]
    serializer_class = AiDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = AiDocument.objects.all()

    def create(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=400)
        if file.size > MAX_FILE_MB * 1024 * 1024:
            return Response({"error": f"File too large. Max {MAX_FILE_MB}MB."}, status=413)

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        doc_id = str(uuid.uuid4())
        save_path = UPLOAD_DIR / f"{doc_id}_{file.name}"

        sha = hashlib.sha256()
        with open(save_path, "wb") as f:
            for chunk in file.chunks():
                sha.update(chunk)
                f.write(chunk)

        doc = AiDocument.objects.create(
            id=doc_id,
            name=file.name,
            file_path=str(save_path),
            mime_type=file.content_type or "",
            file_size=file.size,
            sha256_hash=sha.hexdigest(),
            created_by=request.user,
        )
        # Queue parse task
        from apps.conductor.tasks import parse_document
        parse_document.delay(str(doc.id))

        return Response(AiDocumentSerializer(doc).data, status=201)

    @action(detail=True, methods=["post"], url_path="reparse")
    def reparse(self, request, pk=None):
        doc = self.get_object()
        doc.parse_status = "pending"
        doc.parse_error = ""
        doc.save(update_fields=["parse_status", "parse_error", "updated_at"])
        from apps.conductor.tasks import parse_document
        parse_document.delay(str(doc.id))
        return Response({"status": "queued"})

    def get_permissions(self):
        if self.action == "destroy":
            return [ConductorEnabled(), CanRunConductor()]
        return super().get_permissions()


# ─── Connectors ───────────────────────────────────────────────────────────────

class AiConnectorViewSet(viewsets.ModelViewSet):
    permission_classes = [ConductorEnabled, CanRunConductor]
    serializer_class = AiConnectorSerializer
    queryset = AiConnector.objects.prefetch_related("credentials")

    def perform_create(self, serializer):
        creds = self.request.data.get("credentials", [])
        connector_type = serializer.validated_data.get("connector_type")
        token = ""
        if connector_type == "webhook":
            token = secrets.token_urlsafe(32)
        connector = serializer.save(created_by=self.request.user, webhook_token=token)
        self._save_creds(connector, creds)

    def perform_update(self, serializer):
        creds = self.request.data.get("credentials", [])
        connector = serializer.save(updated_by=self.request.user)
        if creds:
            self._save_creds(connector, creds)

    def _save_creds(self, connector, creds: list):
        for cred in creds:
            key = cred.get("key") or cred.get("credential_key")
            value = cred.get("value") or cred.get("encrypted_value", "")
            if key and value:
                AiConnectorCredential.objects.update_or_create(
                    connector=connector, credential_key=key,
                    defaults={"encrypted_value": encrypt(value)},
                )

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        connector = self.get_object()
        instance = build_connector(connector)
        if not instance:
            return Response({"success": False, "message": "Unknown connector type"}, status=400)
        loop = asyncio.new_event_loop()
        try:
            ok, msg = loop.run_until_complete(instance.test_connection())
        finally:
            loop.close()
        connector.last_tested_at = timezone.now()
        connector.last_test_status = "success" if ok else "failed"
        connector.last_test_message = msg
        connector.save(update_fields=["last_tested_at", "last_test_status", "last_test_message", "updated_at"])
        return Response({"success": ok, "message": msg})

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        connector = self.get_object()
        from apps.conductor.tasks import sync_connector
        sync_connector.delay(str(connector.id))
        return Response({"status": "queued"})


# ─── Inbound Webhook ─────────────────────────────────────────────────────────

class WebhookReceiveView(APIView):
    permission_classes = []  # No auth — token in URL

    def post(self, request, token):
        try:
            connector = AiConnector.objects.get(webhook_token=token, connector_type="webhook", is_active=True)
        except AiConnector.DoesNotExist:
            return Response({"error": "Invalid token"}, status=404)

        # HMAC verification if secret configured
        secret = connector.config.get("hmac_secret", "")
        if secret:
            from apps.conductor.integrations.webhook_handler import verify_hmac_signature
            sig = request.headers.get("X-Hub-Signature-256", "")
            if not verify_hmac_signature(request.body, sig, secret):
                return Response({"error": "Invalid signature"}, status=401)

        from apps.conductor.integrations.webhook_handler import process_webhook_payload
        payload_data = process_webhook_payload(connector, request.data)
        AiConnectorRun.objects.create(
            connector=connector, trigger="agent",
            status="completed", records_collected=1,
            started_at=timezone.now(), completed_at=timezone.now(),
            result_summary=payload_data,
        )
        return Response({"received": True})


# ─── Agent Runs ───────────────────────────────────────────────────────────────

class AiAgentRunViewSet(viewsets.ModelViewSet):
    queryset = AiAgentRun.objects.select_related("framework").prefetch_related("findings")
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ["create", "cancel", "destroy"]:
            return [ConductorEnabled(), CanRunConductor()]
        return [ConductorEnabled(), CanReadConductor()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AiAgentRunDetailSerializer
        return AiAgentRunListSerializer

    def create(self, request, *args, **kwargs):
        ser = RunCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        # Dedup check — block if same framework already running
        fw_id = data.get("framework")
        if fw_id and AiAgentRun.objects.filter(framework_id=fw_id, status__in=["pending", "running"]).exists():
            return Response(
                {"error": "An AI run for this framework is already in progress.", "code": "run_in_progress"},
                status=409,
            )

        run = AiAgentRun.objects.create(
            run_type=data["run_type"],
            framework_id=data.get("framework"),
            program_id=data.get("program"),
            triggered_by="manual",
            scope=data,
            created_by=request.user,
        )

        # Precheck Ollama before dispatching
        from apps.conductor.tasks import run_orchestration
        task = run_orchestration.delay(str(run.id), data)
        run.celery_task_id = task.id
        run.save(update_fields=["celery_task_id", "updated_at"])

        return Response(AiAgentRunListSerializer(run).data, status=201)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        run = self.get_object()
        if run.status not in ("pending", "running"):
            return Response({"error": "Run is not active"}, status=400)
        if run.celery_task_id:
            from config.celery import app as celery_app
            celery_app.control.revoke(run.celery_task_id, terminate=True)
        run.status = "cancelled"
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "completed_at", "updated_at"])
        return Response({"status": "cancelled"})

    @action(detail=True, methods=["get"], url_path="stream")
    def stream(self, request, pk=None):
        run_id = pk

        def event_stream():
            import time
            for _ in range(300):  # max 10 minutes polling
                try:
                    run = AiAgentRun.objects.get(id=run_id)
                    data = json.dumps({
                        "status": run.status,
                        "progress_pct": run.progress_pct,
                        "current_agent": run.current_agent,
                        "compliance_score": run.compliance_score,
                        "findings_count": run.findings_count,
                    })
                    yield f"data: {data}\n\n"
                    if run.status in ("completed", "completed_with_warnings", "failed", "cancelled"):
                        break
                except AiAgentRun.DoesNotExist:
                    break
                time.sleep(2)

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


# ─── Findings ────────────────────────────────────────────────────────────────

class AiAgentFindingViewSet(viewsets.ModelViewSet):
    serializer_class = AiAgentFindingSerializer
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_permissions(self):
        return [ConductorEnabled(), CanReadConductor()]

    def get_queryset(self):
        qs = AiAgentFinding.objects.select_related("run", "control", "promoted_to_issue")
        # Filter params
        severity = self.request.query_params.get("severity")
        status_filter = self.request.query_params.get("status")
        control = self.request.query_params.get("control")
        run = self.request.query_params.get("run")
        if severity:
            qs = qs.filter(severity=severity)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if control:
            qs = qs.filter(control_id=control)
        if run:
            qs = qs.filter(run_id=run)
        return qs

    @action(detail=True, methods=["post"], url_path="promote")
    def promote(self, request, pk=None):
        finding = self.get_object()
        if finding.status == "promoted":
            return Response({"error": "Already promoted"}, status=400)
        if not finding.control_id:
            return Response({"error": "No control linked to this finding"}, status=400)

        from apps.controls.models import ControlIssue
        issue = ControlIssue.objects.create(
            control_id=finding.control_id,
            title=finding.title,
            description=finding.description,
            severity=finding.severity if finding.severity in ("low", "medium", "high", "critical") else "medium",
            status="open",
            created_by=request.user,
        )
        finding.promoted_to_issue = issue
        finding.status = "promoted"
        finding.save(update_fields=["promoted_to_issue", "status", "updated_at"])
        return Response({"issue_id": str(issue.id), "status": "promoted"})


# ─── Reports ─────────────────────────────────────────────────────────────────

class AiReportViewSet(viewsets.ModelViewSet):
    serializer_class = AiReportSerializer
    http_method_names = ["get", "delete", "head", "options"]

    def get_permissions(self):
        return [ConductorEnabled(), CanReadConductor()]

    def get_queryset(self):
        return AiReport.objects.select_related("run", "framework").prefetch_related("sections")

    @action(detail=True, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, pk=None):
        report = self.get_object()
        if report.pdf_path and os.path.exists(report.pdf_path):
            return FileResponse(open(report.pdf_path, "rb"), content_type="application/pdf",
                                as_attachment=True, filename=f"report_{report.id}.pdf")
        # Queue generation
        from apps.conductor.tasks import export_report_pdf
        export_report_pdf.delay(str(report.id))
        return Response({"status": "generating", "message": "PDF generation queued. Try again shortly."}, status=202)


# ─── Ollama ──────────────────────────────────────────────────────────────────

class OllamaHealthView(APIView):
    permission_classes = [ConductorEnabled]

    def get(self, request):
        loop = asyncio.new_event_loop()
        try:
            from apps.conductor.llm.ollama_client import get_ollama
            client = get_ollama()
            healthy = loop.run_until_complete(client.health())
            models = loop.run_until_complete(client.list_models()) if healthy else []
        finally:
            loop.close()
        return Response({
            "healthy": healthy,
            "base_url": getattr(settings, "OLLAMA_BASE_URL", ""),
            "models": models,
        })


class OllamaModelsView(APIView):
    permission_classes = [ConductorEnabled]

    def get(self, request):
        loop = asyncio.new_event_loop()
        try:
            from apps.conductor.llm.ollama_client import get_ollama
            models = loop.run_until_complete(get_ollama().list_models())
        finally:
            loop.close()
        return Response({"models": models})

    def post(self, request):
        model = request.data.get("model", "")
        if not model:
            return Response({"error": "model is required"}, status=400)

        def stream():
            loop = asyncio.new_event_loop()
            try:
                from apps.conductor.llm.ollama_client import get_ollama
                async def _pull():
                    async for status_msg in get_ollama().pull_model(model):
                        yield f"data: {json.dumps({'status': status_msg})}\n\n"
                    yield "data: {\"status\": \"done\"}\n\n"

                async def _collect():
                    async for chunk in _pull():
                        yield chunk

                import asyncio
                gen = _collect()
                while True:
                    try:
                        chunk = loop.run_until_complete(gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
            finally:
                loop.close()

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        return response
