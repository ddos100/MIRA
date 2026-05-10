from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class Evidence(Base, BaseModel):
    __tablename__ = "evidence"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # manual | db | api | ssh | webhook | connector
    source_type: Mapped[str] = mapped_column(String(32), default="manual")
    connector_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("connectors.id", ondelete="SET NULL")
    )
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    collected_by: Mapped[Optional[str]] = mapped_column(String(255))

    # File metadata
    file_path: Mapped[Optional[str]] = mapped_column(String(1024))
    file_name: Mapped[Optional[str]] = mapped_column(String(512))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128))

    # Integrity
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64))
    hash_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    hash_valid: Mapped[Optional[bool]] = mapped_column(Boolean)

    # Inline content (for webhook payloads, API responses, etc.)
    raw_content: Mapped[Optional[str]] = mapped_column(Text)

    # Workflow
    # pending | verified | rejected | needs_review
    status: Mapped[str] = mapped_column(String(32), default="pending")
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text)

    tags: Mapped[List["EvidenceTag"]] = relationship(
        "EvidenceTag", back_populates="evidence", cascade="all, delete-orphan"
    )
    control_links: Mapped[List["ControlEvidence"]] = relationship(
        "ControlEvidence", back_populates="evidence", cascade="all, delete-orphan"
    )


class EvidenceTag(Base, BaseModel):
    __tablename__ = "evidence_tags"

    evidence_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(String(512), nullable=False)

    evidence: Mapped["Evidence"] = relationship("Evidence", back_populates="tags")


class ControlEvidence(Base, BaseModel):
    __tablename__ = "control_evidence"

    evidence_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False
    )
    control_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("controls.id", ondelete="CASCADE")
    )
    requirement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("requirements.id", ondelete="CASCADE")
    )
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    evidence: Mapped["Evidence"] = relationship("Evidence", back_populates="control_links")
