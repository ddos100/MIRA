from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class Document(Base, BaseModel):
    __tablename__ = "documents"

    name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64))

    # pending | processing | done | failed
    parse_status: Mapped[str] = mapped_column(String(16), default="pending")
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    parse_error: Mapped[Optional[str]] = mapped_column(Text)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[Optional[int]] = mapped_column(Integer)

    # upload | connector | webhook
    source_type: Mapped[str] = mapped_column(String(32), default="upload")
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(255))

    doc_metadata: Mapped[Optional[Dict]] = mapped_column(JSONB)

    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base, BaseModel):
    __tablename__ = "document_chunks"

    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # ChromaDB document ID reference
    chroma_id: Mapped[Optional[str]] = mapped_column(String(128))
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    token_count: Mapped[Optional[int]] = mapped_column(Integer)
    chunk_metadata: Mapped[Optional[Dict]] = mapped_column(JSONB)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
