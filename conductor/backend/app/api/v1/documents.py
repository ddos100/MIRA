"""Documents API — upload, parse, list, delete."""
import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.database import get_db
from app.models.document import Document
from app.config import get_settings
from app.documents.parser import compute_sha256, SUPPORTED_TYPES
from app.tasks.agent_tasks import parse_document

router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()


class DocumentOut(BaseModel):
    id: str
    name: str
    mime_type: Optional[str]
    file_size: Optional[int]
    parse_status: str
    chunk_count: int
    page_count: Optional[int]
    source_type: str
    uploaded_by: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Supported: {list(SUPPORTED_TYPES.keys())}",
        )

    # Save file
    upload_dir = Path(settings.upload_dir) / "documents"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / (file.filename or "upload")

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = dest.stat().st_size
    if file_size > settings.max_upload_size_mb * 1024 * 1024:
        dest.unlink()
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")

    sha256 = compute_sha256(str(dest))

    doc = Document(
        name=file.filename or "upload",
        file_path=str(dest),
        mime_type=file.content_type,
        file_size=file_size,
        sha256_hash=sha256,
        parse_status="pending",
        source_type="upload",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Queue parsing task
    parse_document.delay(doc.id)

    return {"id": doc.id, "name": doc.name, "parse_status": doc.parse_status, "message": "Document queued for parsing"}


@router.get("/", response_model=List[DocumentOut])
async def list_documents(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(Document).offset(skip).limit(limit).order_by(Document.created_at.desc())
    if status:
        query = query.where(Document.parse_status == status)
    result = await db.execute(query)
    docs = result.scalars().all()
    return [
        DocumentOut(
            id=d.id, name=d.name, mime_type=d.mime_type, file_size=d.file_size,
            parse_status=d.parse_status, chunk_count=d.chunk_count,
            page_count=d.page_count, source_type=d.source_type,
            uploaded_by=d.uploaded_by, created_at=str(d.created_at),
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut(
        id=doc.id, name=doc.name, mime_type=doc.mime_type, file_size=doc.file_size,
        parse_status=doc.parse_status, chunk_count=doc.chunk_count,
        page_count=doc.page_count, source_type=doc.source_type,
        uploaded_by=doc.uploaded_by, created_at=str(doc.created_at),
    )


@router.post("/{doc_id}/reparse")
async def reparse_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    parse_document.delay(doc.id)
    return {"message": "Document re-queued for parsing"}


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from ChromaDB
    from app.llm.rag_pipeline import get_rag
    await get_rag().delete_document(doc_id)

    # Remove file
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()
