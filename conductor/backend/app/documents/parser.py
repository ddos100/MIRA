"""Dispatcher: routes uploaded files to the correct parser and ingests into RAG pipeline."""
import hashlib
import os
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.document import Document, DocumentChunk
from app.documents.chunker import chunk_text
from app.documents.pdf_parser import parse_pdf
from app.documents.office_parser import parse_docx, parse_xlsx, parse_csv
from app.documents.image_parser import parse_image
from app.llm.rag_pipeline import get_rag

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xlsx",
    "text/csv": "csv",
    "text/plain": "txt",
    "image/png": "image",
    "image/jpeg": "image",
    "image/tiff": "image",
    "image/webp": "image",
}


def compute_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract_text(file_path: str, mime_type: str) -> tuple[str, Optional[int]]:
    fmt = SUPPORTED_TYPES.get(mime_type, "txt")

    if fmt == "pdf":
        text, _, page_count = parse_pdf(file_path)
        return text, page_count
    elif fmt == "docx":
        text, _ = parse_docx(file_path)
        return text, None
    elif fmt == "xlsx":
        return parse_xlsx(file_path), None
    elif fmt == "csv":
        return parse_csv(file_path), None
    elif fmt == "image":
        return parse_image(file_path), 1
    else:
        with open(file_path, encoding="utf-8", errors="replace") as f:
            return f.read(), None


async def parse_and_ingest(document_id: str, db: AsyncSession) -> None:
    """Parse a document and ingest its chunks into ChromaDB. Called from Celery task."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        return

    await db.execute(
        update(Document).where(Document.id == document_id).values(parse_status="processing")
    )
    await db.commit()

    try:
        text, page_count = _extract_text(doc.file_path, doc.mime_type or "text/plain")

        # Remove old ChromaDB chunks
        rag = get_rag()
        await rag.delete_document(document_id)

        # Remove old DB chunks
        old_chunks = await db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )
        for chunk in old_chunks.scalars():
            await db.delete(chunk)

        chunks = chunk_text(text)
        db_chunks = []
        for i, chunk_content in enumerate(chunks):
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=i,
                content=chunk_content,
                page_number=None,
                chunk_metadata={"source": doc.name},
            )
            db.add(db_chunk)
            db_chunks.append(db_chunk)

        await db.flush()

        # Ingest into ChromaDB
        chunk_ids = [c.id for c in db_chunks]
        metadatas = [{"document_name": doc.name, "chunk_index": i} for i in range(len(chunks))]
        chroma_ids = await rag.ingest_chunks(chunks, document_id, chunk_ids, metadatas)

        # Update ChromaDB IDs in DB
        for db_chunk, chroma_id in zip(db_chunks, chroma_ids):
            db_chunk.chroma_id = chroma_id

        await db.execute(
            update(Document).where(Document.id == document_id).values(
                parse_status="done",
                parsed_at=datetime.now(timezone.utc),
                chunk_count=len(chunks),
                page_count=page_count,
            )
        )
        await db.commit()

    except Exception as exc:
        await db.execute(
            update(Document).where(Document.id == document_id).values(
                parse_status="failed",
                parse_error=str(exc),
            )
        )
        await db.commit()
        raise
