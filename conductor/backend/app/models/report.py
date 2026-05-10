from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class Report(Base, BaseModel):
    __tablename__ = "reports"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    # executive | audit | gap_analysis | remediation | board
    report_type: Mapped[str] = mapped_column(String(32), nullable=False)
    run_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agent_runs.id", ondelete="SET NULL")
    )
    framework_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("frameworks.id", ondelete="SET NULL")
    )
    # generating | ready | failed
    status: Mapped[str] = mapped_column(String(16), default="generating")
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    generated_by: Mapped[str] = mapped_column(String(255), default="MIRA-Conductor AI")

    summary: Mapped[Optional[str]] = mapped_column(Text)
    compliance_score: Mapped[Optional[float]] = mapped_column()
    findings_summary: Mapped[Optional[Dict]] = mapped_column(JSONB)

    sections: Mapped[List["ReportSection"]] = relationship(
        "ReportSection", back_populates="report", cascade="all, delete-orphan",
        order_by="ReportSection.section_order"
    )
    exports: Mapped[List["ReportExport"]] = relationship(
        "ReportExport", back_populates="report", cascade="all, delete-orphan"
    )


class ReportSection(Base, BaseModel):
    __tablename__ = "report_sections"

    report_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    section_order: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text)
    section_data: Mapped[Optional[Dict]] = mapped_column(JSONB)

    report: Mapped["Report"] = relationship("Report", back_populates="sections")


class ReportExport(Base, BaseModel):
    __tablename__ = "report_exports"

    report_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    # pdf | excel | json
    format: Mapped[str] = mapped_column(String(16), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1024))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)

    report: Mapped["Report"] = relationship("Report", back_populates="exports")
