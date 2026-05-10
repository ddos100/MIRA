"""Inbound webhook handler — validates HMAC signatures and stores payloads as evidence."""
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence, EvidenceTag
from app.models.integration import Connector, ConnectorRun


def verify_hmac_signature(
    payload: bytes,
    secret: str,
    signature_header: str,
    algorithm: str = "sha256",
) -> bool:
    expected = hmac.new(
        secret.encode(), payload, getattr(hashlib, algorithm)
    ).hexdigest()
    provided = signature_header.split("=")[-1]
    return hmac.compare_digest(expected, provided)


async def process_webhook_payload(
    connector: Connector,
    payload: dict,
    raw_body: bytes,
    db: AsyncSession,
) -> Evidence:
    """Store inbound webhook payload as evidence."""
    run = ConnectorRun(
        connector_id=connector.id,
        trigger="webhook",
        status="completed",
        records_collected=1,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(run)

    evidence = Evidence(
        title=f"Webhook: {connector.name} — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        description=f"Inbound webhook payload from connector '{connector.name}'",
        source_type="webhook",
        connector_id=connector.id,
        collected_at=datetime.now(timezone.utc),
        raw_content=json.dumps(payload, indent=2),
        status="pending",
    )
    db.add(evidence)

    # Tag key fields from payload
    for key, value in payload.items():
        if isinstance(value, (str, int, float, bool)) and len(str(value)) < 512:
            db.add(EvidenceTag(evidence_id=evidence.id, key=key, value=str(value)))

    await db.commit()
    return evidence
