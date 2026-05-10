"""Integrations API — CRUD connectors, test connection, run sync, inbound webhooks."""
import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.integration import Connector, ConnectorCredential, ConnectorRun
from app.services.crypto_service import encrypt
from app.services.connector_factory import build_connector
from app.integrations.webhook_handler import process_webhook_payload, verify_hmac_signature

router = APIRouter(prefix="/integrations", tags=["Integrations"])


class ConnectorIn(BaseModel):
    name: str
    description: Optional[str] = None
    connector_type: str
    config: Dict[str, Any] = {}
    credentials: Dict[str, str] = {}
    sync_schedule: Optional[str] = None


@router.get("/")
async def list_connectors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).order_by(Connector.name))
    return [
        {"id": c.id, "name": c.name, "connector_type": c.connector_type,
         "is_active": c.is_active, "last_test_status": c.last_test_status,
         "last_tested_at": str(c.last_tested_at) if c.last_tested_at else None}
        for c in result.scalars()
    ]


@router.post("/", status_code=201)
async def create_connector(body: ConnectorIn, db: AsyncSession = Depends(get_db)):
    # Generate webhook token if type is webhook
    config = dict(body.config)
    if body.connector_type == "webhook":
        config.setdefault("token", secrets.token_urlsafe(32))

    connector = Connector(
        name=body.name,
        description=body.description,
        connector_type=body.connector_type,
        config=config,
        sync_schedule=body.sync_schedule,
    )
    db.add(connector)
    await db.flush()

    for key, value in body.credentials.items():
        cred = ConnectorCredential(
            connector_id=connector.id,
            credential_key=key,
            encrypted_value=encrypt(value),
        )
        db.add(cred)

    await db.commit()
    await db.refresh(connector)
    return {"id": connector.id, "name": connector.name, "webhook_token": config.get("token")}


@router.get("/{conn_id}")
async def get_connector(conn_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).where(Connector.id == conn_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "connector_type": c.connector_type, "config": c.config,
        "is_active": c.is_active, "sync_schedule": c.sync_schedule,
        "last_test_status": c.last_test_status,
        "last_tested_at": str(c.last_tested_at) if c.last_tested_at else None,
    }


@router.put("/{conn_id}")
async def update_connector(conn_id: str, body: ConnectorIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).where(Connector.id == conn_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Connector not found")
    c.name = body.name
    c.description = body.description
    c.connector_type = body.connector_type
    c.config = body.config
    c.sync_schedule = body.sync_schedule

    if body.credentials:
        # Replace credentials
        existing = await db.execute(select(ConnectorCredential).where(ConnectorCredential.connector_id == conn_id))
        for cred in existing.scalars():
            await db.delete(cred)
        for key, value in body.credentials.items():
            db.add(ConnectorCredential(connector_id=conn_id, credential_key=key, encrypted_value=encrypt(value)))

    await db.commit()
    return {"id": c.id, "message": "Updated"}


@router.delete("/{conn_id}", status_code=204)
async def delete_connector(conn_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).where(Connector.id == conn_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Connector not found")
    await db.delete(c)
    await db.commit()


@router.post("/{conn_id}/test")
async def test_connector(conn_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).where(Connector.id == conn_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Connector not found")

    try:
        conn = await build_connector(c, db)
        success, message = await conn.test_connection()
    except Exception as exc:
        success, message = False, str(exc)

    c.last_tested_at = datetime.now(timezone.utc)
    c.last_test_status = "success" if success else "failed"
    c.last_test_message = message
    await db.commit()

    return {"success": success, "message": message}


@router.post("/{conn_id}/run")
async def run_connector(conn_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connector).where(Connector.id == conn_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Connector not found")

    run = ConnectorRun(
        connector_id=conn_id,
        trigger="manual",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    async def _do_run():
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as sess:
            r = await sess.execute(select(Connector).where(Connector.id == conn_id))
            connector = r.scalar_one_or_none()
            run_r = await sess.execute(select(ConnectorRun).where(ConnectorRun.id == run.id))
            run_obj = run_r.scalar_one_or_none()
            try:
                conn = await build_connector(connector, sess)
                data = await conn.collect()
                run_obj.records_collected = len(data)
                run_obj.status = "completed"
            except Exception as exc:
                run_obj.status = "failed"
                run_obj.error_message = str(exc)
            run_obj.completed_at = datetime.now(timezone.utc)
            await sess.commit()

    background_tasks.add_task(_do_run)
    return {"run_id": run.id, "message": "Connector run started"}


@router.get("/{conn_id}/runs")
async def list_connector_runs(conn_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConnectorRun).where(ConnectorRun.connector_id == conn_id)
        .order_by(ConnectorRun.created_at.desc()).limit(20)
    )
    return [
        {"id": r.id, "trigger": r.trigger, "status": r.status,
         "records_collected": r.records_collected,
         "started_at": str(r.started_at) if r.started_at else None,
         "completed_at": str(r.completed_at) if r.completed_at else None,
         "error_message": r.error_message}
        for r in result.scalars()
    ]


@router.post("/webhooks/receive/{token}")
async def receive_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Inbound webhook endpoint. Token identifies the connector."""
    result = await db.execute(
        select(Connector).where(
            Connector.connector_type == "webhook",
            Connector.is_active == True,
        )
    )
    connector = None
    for c in result.scalars():
        if c.config and c.config.get("token") == token:
            connector = c
            break

    if not connector:
        raise HTTPException(status_code=404, detail="Unknown webhook token")

    raw_body = await request.body()
    payload = {}
    try:
        payload = json.loads(raw_body)
    except Exception:
        payload = {"raw": raw_body.decode(errors="replace")}

    # Verify HMAC if secret configured
    secret = connector.config.get("hmac_secret")
    sig_header = request.headers.get("X-Hub-Signature-256", "")
    if secret and sig_header:
        if not verify_hmac_signature(raw_body, secret, sig_header):
            raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    evidence = await process_webhook_payload(connector, payload, raw_body, db)
    return {"message": "Webhook received", "evidence_id": evidence.id}
