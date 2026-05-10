"""Evidence file storage with SHA-256 integrity checking."""
import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.evidence import Evidence

settings = get_settings()


def _evidence_path(evidence_id: str, filename: str) -> Path:
    now = datetime.now(timezone.utc)
    rel = Path(str(now.year)) / str(now.month).zfill(2) / evidence_id
    abs_dir = Path(settings.upload_dir) / rel
    abs_dir.mkdir(parents=True, exist_ok=True)
    return abs_dir / filename


def compute_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


async def save_upload(evidence: Evidence, upload: UploadFile, db: AsyncSession) -> Evidence:
    dest = _evidence_path(evidence.id, upload.filename or "file")
    with open(dest, "wb") as f:
        shutil.copyfileobj(upload.file, f)

    file_size = dest.stat().st_size
    sha256 = compute_sha256(str(dest))

    await db.execute(
        update(Evidence).where(Evidence.id == evidence.id).values(
            file_path=str(dest),
            file_name=upload.filename,
            file_size=file_size,
            mime_type=upload.content_type,
            sha256_hash=sha256,
            hash_verified_at=datetime.now(timezone.utc),
            hash_valid=True,
            collected_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    return evidence


async def verify_hash(evidence: Evidence, db: AsyncSession) -> bool:
    if not evidence.file_path or not os.path.exists(evidence.file_path):
        return False

    actual = compute_sha256(evidence.file_path)
    valid = actual == evidence.sha256_hash

    await db.execute(
        update(Evidence).where(Evidence.id == evidence.id).values(
            hash_verified_at=datetime.now(timezone.utc),
            hash_valid=valid,
        )
    )
    await db.commit()
    return valid
