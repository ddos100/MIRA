"""Evidence API — catalog, upload, hash verify, link to controls."""
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.evidence import Evidence, ControlEvidence
from app.services.evidence_service import save_upload, verify_hash

router = APIRouter(prefix="/evidence", tags=["Evidence"])


@router.get("/")
async def list_evidence(
    source_type: Optional[str] = None,
    ev_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(Evidence).order_by(Evidence.created_at.desc()).offset(skip).limit(limit)
    if source_type:
        query = query.where(Evidence.source_type == source_type)
    if ev_status:
        query = query.where(Evidence.status == ev_status)
    result = await db.execute(query)
    return [_ev_to_dict(e) for e in result.scalars()]


@router.post("/upload", status_code=201)
async def upload_evidence(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ev = Evidence(
        title=title,
        description=description,
        source_type="manual",
        status="pending",
    )
    db.add(ev)
    await db.flush()
    await save_upload(ev, file, db)
    await db.refresh(ev)
    return _ev_to_dict(ev)


@router.get("/{ev_id}")
async def get_evidence(ev_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Evidence).where(Evidence.id == ev_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return _ev_to_dict(ev)


@router.post("/{ev_id}/verify")
async def verify_evidence_hash(ev_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Evidence).where(Evidence.id == ev_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    valid = await verify_hash(ev, db)
    return {"hash_valid": valid, "sha256_hash": ev.sha256_hash}


@router.post("/{ev_id}/link")
async def link_evidence(
    ev_id: str,
    control_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    link = ControlEvidence(
        evidence_id=ev_id,
        control_id=control_id,
        requirement_id=requirement_id,
    )
    db.add(link)
    await db.commit()
    return {"message": "Evidence linked"}


@router.get("/{ev_id}/download")
async def download_evidence(ev_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Evidence).where(Evidence.id == ev_id))
    ev = result.scalar_one_or_none()
    if not ev or not ev.file_path:
        raise HTTPException(status_code=404, detail="No file for this evidence")
    if not os.path.exists(ev.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(ev.file_path, filename=ev.file_name or "evidence")


@router.delete("/{ev_id}", status_code=204)
async def delete_evidence(ev_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Evidence).where(Evidence.id == ev_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if ev.file_path and os.path.exists(ev.file_path):
        os.remove(ev.file_path)
    await db.delete(ev)
    await db.commit()


def _ev_to_dict(e: Evidence) -> dict:
    return {
        "id": e.id, "title": e.title, "description": e.description,
        "source_type": e.source_type, "status": e.status,
        "file_name": e.file_name, "file_size": e.file_size,
        "mime_type": e.mime_type, "sha256_hash": e.sha256_hash,
        "hash_valid": e.hash_valid, "collected_at": str(e.collected_at) if e.collected_at else None,
        "created_at": str(e.created_at),
    }
