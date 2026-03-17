"""Celery tasks for outbound webhook delivery."""
import hashlib
import hmac
import json
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5)
def deliver_webhook(self, webhook_id: str, event: str, payload: dict):
    """
    Deliver a single webhook event to the configured URL.

    Signs the payload with HMAC-SHA256 if a secret is configured,
    and records the delivery attempt in WebhookDelivery.
    """
    import requests  # type: ignore

    from .models import Webhook, WebhookDelivery

    try:
        webhook = Webhook.objects.get(id=webhook_id, is_active=True)
    except Webhook.DoesNotExist:
        logger.warning("Webhook %s not found or inactive", webhook_id)
        return

    body = json.dumps(payload, default=str)
    headers = {
        "Content-Type": "application/json",
        "X-MIRA-Event": event,
        "X-MIRA-Delivery": f"{webhook_id}-{event}",
    }

    if webhook.secret:
        sig = hmac.new(
            webhook.secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()
        headers["X-MIRA-Signature"] = f"sha256={sig}"

    delivery = WebhookDelivery.objects.create(
        webhook=webhook,
        event=event,
        payload=payload,
        status=WebhookDelivery.DeliveryStatus.PENDING,
    )

    try:
        resp = requests.post(
            webhook.url,
            data=body,
            headers=headers,
            timeout=15,
        )
        delivery.status = (
            WebhookDelivery.DeliveryStatus.SUCCESS
            if resp.ok
            else WebhookDelivery.DeliveryStatus.FAILED
        )
        delivery.response_status = resp.status_code
        delivery.response_body = resp.text[:2000]
        delivery.save(update_fields=["status", "response_status", "response_body"])

        from django.utils import timezone
        webhook.last_delivery_at = timezone.now()
        webhook.save(update_fields=["last_delivery_at"])

        logger.info(
            "Webhook %s [%s] delivered → HTTP %s",
            webhook.name, event, resp.status_code,
        )

        if not resp.ok:
            raise ValueError(f"Non-2xx response: {resp.status_code}")

    except Exception as exc:
        delivery.status = WebhookDelivery.DeliveryStatus.FAILED
        delivery.error_message = str(exc)
        delivery.save(update_fields=["status", "error_message"])
        logger.warning("Webhook delivery failed: %s", exc)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)


def dispatch_webhook_event(event: str, payload: dict):
    """
    Fire-and-forget: queue delivery to all active webhooks subscribed to `event`.

    Call from signal handlers or post_save hooks.
    Example: dispatch_webhook_event("risk.created", {"id": ..., "title": ...})
    """
    from .models import Webhook

    webhooks = Webhook.objects.filter(is_active=True)
    for wh in webhooks:
        subscribed = wh.events
        if not subscribed or event in subscribed or "*" in subscribed:
            deliver_webhook.delay(str(wh.id), event, payload)
