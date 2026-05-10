"""Inbound webhook processing with HMAC-SHA256 verification."""
import hashlib
import hmac
import json
import logging

logger = logging.getLogger(__name__)


def verify_hmac_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


def process_webhook_payload(connector, payload: dict) -> dict:
    """Create evidence record from inbound webhook payload."""
    from django.utils import timezone
    from apps.conductor.models import AiDocument
    import json

    title = f"Webhook: {connector.name} @ {timezone.now().isoformat()}"
    content = json.dumps(payload, indent=2)
    return {"title": title, "content": content, "source": "webhook", "connector_id": str(connector.id)}
