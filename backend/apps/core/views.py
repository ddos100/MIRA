from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Attachment, AuditLog, Comment, CustomField, CustomFieldValue, Notification, StatusRule, Tag, Webhook, WebhookDelivery
from .serializers import (
    AttachmentSerializer,
    AuditLogSerializer,
    CommentSerializer,
    CustomFieldSerializer,
    CustomFieldValueSerializer,
    NotificationSerializer,
    StatusRuleSerializer,
    TagSerializer,
    WebhookDeliverySerializer,
    WebhookSerializer,
)


class CustomFieldViewSet(viewsets.ModelViewSet):
    """
    CRUD for CustomField definitions.
    Filter by ?content_type=<app_label>.<model_name> to get fields for a specific model.
    """

    serializer_class = CustomFieldSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["field_type", "is_required"]
    ordering_fields = ["order", "name", "created_at"]

    def get_queryset(self):
        qs = CustomField.objects.select_related("content_type")
        ct_param = self.request.query_params.get("content_type")
        if ct_param:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
                qs = qs.filter(content_type=ct)
            except (ValueError, ContentType.DoesNotExist):
                pass
        return qs

    def perform_create(self, serializer):
        ct_param = self.request.data.get("content_type")
        ct = None
        if ct_param:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
            except (ValueError, ContentType.DoesNotExist):
                pass
        serializer.save(content_type=ct)


class CustomFieldValueViewSet(viewsets.ModelViewSet):
    """
    CRUD for CustomFieldValue instances.
    Filter by ?object_id=<uuid>&content_type=<app_label>.<model_name>
    """

    serializer_class = CustomFieldValueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["custom_field"]

    def get_queryset(self):
        qs = CustomFieldValue.objects.select_related("custom_field__content_type")
        obj_id = self.request.query_params.get("object_id")
        ct_param = self.request.query_params.get("content_type")
        if obj_id:
            qs = qs.filter(object_id=obj_id)
        if ct_param:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
                qs = qs.filter(custom_field__content_type=ct)
            except (ValueError, ContentType.DoesNotExist):
                pass
        return qs

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Upsert multiple field values for an object in one request.
        Payload: {"object_id": "<uuid>", "values": [{"custom_field": "<uuid>", "value": ...}]}
        """
        obj_id = request.data.get("object_id")
        values = request.data.get("values", [])
        if not obj_id or not isinstance(values, list):
            return Response(
                {"error": "object_id and values[] are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        results = []
        for item in values:
            cf_id = item.get("custom_field")
            try:
                cf = CustomField.objects.get(pk=cf_id)
            except CustomField.DoesNotExist:
                continue
            obj, _ = CustomFieldValue.objects.update_or_create(
                custom_field=cf,
                object_id=obj_id,
                defaults={"value": item.get("value")},
            )
            results.append(CustomFieldValueSerializer(obj).data)
        return Response(results, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    """
    CRUD for comments on any object.
    Filter by ?content_type=<app_label>.<model_name>&object_id=<uuid>
    """

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Comment.objects.select_related("created_by", "content_type")
        ct_param = self.request.query_params.get("content_type")
        obj_id = self.request.query_params.get("object_id")
        if ct_param and obj_id:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
                qs = qs.filter(content_type=ct, object_id=obj_id)
            except (ValueError, ContentType.DoesNotExist):
                pass
        return qs

    def perform_create(self, serializer):
        ct_param = self.request.data.get("content_type")
        obj_id = self.request.data.get("object_id")
        ct = None
        if ct_param:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
            except (ValueError, ContentType.DoesNotExist):
                pass
        serializer.save(created_by=self.request.user, content_type=ct, object_id=obj_id)


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for file attachments on any object.
    Filter by ?content_type=<app_label>.<model_name>&object_id=<uuid>
    """

    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Attachment.objects.select_related("created_by", "content_type")
        ct_param = self.request.query_params.get("content_type")
        obj_id = self.request.query_params.get("object_id")
        if ct_param and obj_id:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
                qs = qs.filter(content_type=ct, object_id=obj_id)
            except (ValueError, ContentType.DoesNotExist):
                pass
        return qs

    def perform_create(self, serializer):
        ct_param = self.request.data.get("content_type")
        obj_id = self.request.data.get("object_id")
        ct = None
        if ct_param:
            try:
                app_label, model = ct_param.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model)
            except (ValueError, ContentType.DoesNotExist):
                pass
        upload = self.request.FILES.get("file")
        extra = {}
        if upload:
            extra["filename"] = upload.name
            extra["file_size"] = upload.size
            extra["mime_type"] = upload.content_type or ""
        serializer.save(created_by=self.request.user, content_type=ct, object_id=obj_id, **extra)


class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    notification = generics.get_object_or_404(
        Notification, pk=pk, recipient=request.user
    )
    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=["is_read", "read_at"])
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(
        is_read=True, read_at=timezone.now()
    )
    return Response({"status": "ok"})


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    filterset_fields = ["action", "user"]
    ordering_fields = ["timestamp"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user", "content_type")
        ct_id = self.request.query_params.get("content_type")
        obj_id = self.request.query_params.get("object_id")
        if ct_id and obj_id:
            qs = qs.filter(content_type_id=ct_id, object_id=obj_id)
        return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_check(request):
    return Response({"status": "ok", "service": "MIRA GRC"})


class StatusRuleViewSet(viewsets.ModelViewSet):
    """CRUD for dynamic status transition rules + manual run action."""

    queryset = StatusRule.objects.select_related("content_type").all()
    serializer_class = StatusRuleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["rule_status", "content_type"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "last_run_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        """Manually trigger evaluation of a single rule."""
        from .status_engine import evaluate_rule
        rule = self.get_object()
        count = evaluate_rule(rule)
        return Response({"status": "ok", "affected": count})

    @action(detail=False, methods=["post"], url_path="run-all")
    def run_all(self, request):
        """Manually trigger evaluation of all active rules."""
        from .status_engine import evaluate_all_rules
        results = evaluate_all_rules()
        return Response({"status": "ok", "results": results})


class WebhookViewSet(viewsets.ModelViewSet):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_active"]
    search_fields = ["name", "url"]
    ordering_fields = ["name", "created_at", "last_delivery_at"]

    def get_serializer(self, *args, **kwargs):
        # Limit recent_deliveries to 10 most recent for list view
        instance = args[0] if args else None
        if self.action == "list" and instance is not None:
            # Use prefetch for efficiency
            pass
        return super().get_serializer(*args, **kwargs)

    @action(detail=True, methods=["get"], url_path="deliveries")
    def deliveries(self, request, pk=None):
        webhook = self.get_object()
        qs = WebhookDelivery.objects.filter(webhook=webhook).order_by("-attempted_at")[:50]
        serializer = WebhookDeliverySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        """Send a test ping event to the webhook URL."""
        from .webhook_tasks import deliver_webhook
        webhook = self.get_object()
        deliver_webhook.delay(str(webhook.id), "test.ping", {"message": "MIRA webhook test"})
        return Response({"status": "queued"})
