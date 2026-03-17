from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog, Notification, Tag, Webhook, WebhookDelivery
from .serializers import (
    AuditLogSerializer,
    NotificationSerializer,
    TagSerializer,
    WebhookDeliverySerializer,
    WebhookSerializer,
)


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
