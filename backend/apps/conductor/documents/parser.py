"""
Main document parse-and-ingest pipeline.
Parses file by MIME type, chunks text, stores chunks in DB + ChromaDB.
"""
import asyncio
import hashlib
import logging
import uuid
from pathlib import Path

from django.utils import timezone

from apps.conductor.documents.chunker import chunk_text
from apps.conductor.documents.pdf_parser import parse_pdf
from apps.conductor.documents.office_parser import parse_docx, parse_xlsx, parse_csv
from apps.conductor.documents.image_parser import parse_image
from apps.conductor.llm.ollama_client import get_ollama
from apps.conductor.llm.rag_pipeline import get_rag
from apps.conductor.models import AiDocument, AiDocumentChunk

logger = logging.getLogger(__name__)

MAX_PAGES = 500
IMAGE_MIMES = {"image/png", "image/jpeg", "image/jpg", "image/tiff", "image/bmp", "image/gif"}


async def parse_and_ingest(document_id: str) -> None:
    """Parse a document and ingest chunks into ChromaDB. Called from Celery task."""
    try:
        doc = await asyncio.to_thread(_get_doc, document_id)
    except AiDocument.DoesNotExist:
        logger.error("AiDocument %s not found", document_id)
        return

    await asyncio.to_thread(_set_status, doc, "processing")

    try:
        text, page_count = _extract_text(doc)
        if not text.strip():
            raise ValueError("No text content extracted from document")

        chunks = chunk_text(text)
        chunk_ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"document_id": document_id, "chunk_index": i, "document_name": doc.name} for i in range(len(chunks))]

        # Delete old chunks
        await asyncio.to_thread(_delete_old_chunks, document_id)
        rag = get_rag()
        await rag.delete_document(document_id)

        # Embed + ingest
        ollama = get_ollama()
        try:
            embeddings = await ollama.embed_batch(chunks)
        except Exception as exc:
            logger.warning("Embedding failed, storing without embeddings: %s", exc)
            embeddings = None

        await rag.ingest_chunks(chunks, document_id, chunk_ids, metadatas, embeddings)

        # Save chunk records
        chunk_objs = [
            AiDocumentChunk(
                document_id=document_id,
                chunk_index=i,
                content=c,
                chroma_id=chunk_ids[i],
                page_number=None,
                token_count=len(c.split()),
            )
            for i, c in enumerate(chunks)
        ]
        await asyncio.to_thread(_save_chunks, chunk_objs)

        await asyncio.to_thread(_set_done, doc, len(chunks), page_count)

    except Exception as exc:
        logger.error("Document parse failed %s: %s", document_id, exc)
        await asyncio.to_thread(_set_failed, doc, str(exc))


def _get_doc(document_id: str) -> AiDocument:
    return AiDocument.objects.get(id=document_id)


def _set_status(doc: AiDocument, status: str) -> None:
    doc.parse_status = status
    doc.save(update_fields=["parse_status", "updated_at"])


def _set_done(doc: AiDocument, chunk_count: int, page_count: int) -> None:
    doc.parse_status = "done"
    doc.chunk_count = chunk_count
    doc.page_count = page_count
    doc.parsed_at = timezone.now()
    doc.save(update_fields=["parse_status", "chunk_count", "page_count", "parsed_at", "updated_at"])


def _set_failed(doc: AiDocument, error: str) -> None:
    doc.parse_status = "failed"
    doc.parse_error = error[:2000]
    doc.save(update_fields=["parse_status", "parse_error", "updated_at"])


def _delete_old_chunks(document_id: str) -> None:
    AiDocumentChunk.objects.filter(document_id=document_id).delete()


def _save_chunks(chunk_objs: list) -> None:
    AiDocumentChunk.objects.bulk_create(chunk_objs, batch_size=200)


def _extract_text(doc: AiDocument) -> tuple:
    """Returns (text, page_count)."""
    path = doc.file_path
    mime = doc.mime_type or ""

    if mime == "application/pdf" or path.endswith(".pdf"):
        text, _, page_count = parse_pdf(path)
        return text, page_count
    elif mime in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",) or path.endswith(".docx"):
        text, count = parse_docx(path)
        return text, count
    elif mime in ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",) or path.endswith(".xlsx"):
        text, count = parse_xlsx(path)
        return text, count
    elif mime == "text/csv" or path.endswith(".csv"):
        text, count = parse_csv(path)
        return text, count
    elif mime in IMAGE_MIMES or any(path.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
        text = parse_image(path)
        return text, 1
    elif mime in ("text/plain",) or path.endswith(".txt"):
        with open(path, encoding="utf-8", errors="replace") as f:
            text = f.read()
        return text, text.count("\n")
    else:
        # Try as plain text
        try:
            with open(path, encoding="utf-8", errors="replace") as f:
                text = f.read()
            return text, 1
        except Exception:
            return "", 0
