from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class AgentRun(Base, BaseModel):
    __tablename__ = "agent_runs"

    # full | validate | collect | review | report
    run_type: Mapped[str] = mapped_column(String(32), default="full")
    scope: Mapped[Optional[Dict]] = mapped_column(JSONB)
    # scheduled | manual | webhook | api
    triggered_by: Mapped[str] = mapped_column(String(64), default="manual")
    triggered_by_user: Mapped[Optional[str]] = mapped_column(String(255))

    framework_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("frameworks.id", ondelete="SET NULL")
    )

    # pending | running | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(32), default="pending")
    current_agent: Mapped[Optional[str]] = mapped_column(String(64))
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Results
    compliance_score: Mapped[Optional[float]] = mapped_column(Float)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    evidence_collected: Mapped[int] = mapped_column(Integer, default=0)

    steps: Mapped[List["AgentStep"]] = relationship(
        "AgentStep", back_populates="run", cascade="all, delete-orphan",
        order_by="AgentStep.step_number"
    )
    findings: Mapped[List["AgentFinding"]] = relationship(
        "AgentFinding", back_populates="run", cascade="all, delete-orphan"
    )


class AgentStep(Base, BaseModel):
    __tablename__ = "agent_steps"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False
    )
    # validator | collector | reviewer | reporter | orchestrator
    agent_type: Mapped[str] = mapped_column(String(32), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    tool_used: Mapped[Optional[str]] = mapped_column(String(128))
    input_data: Mapped[Optional[Dict]] = mapped_column(JSONB)
    output_data: Mapped[Optional[Dict]] = mapped_column(JSONB)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer)
    # success | error | skipped
    result: Mapped[str] = mapped_column(String(32), default="success")
    error_detail: Mapped[Optional[str]] = mapped_column(Text)

    run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="steps")


class AgentFinding(Base, BaseModel):
    __tablename__ = "agent_findings"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False
    )
    control_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("controls.id", ondelete="SET NULL")
    )
    requirement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("requirements.id", ondelete="SET NULL")
    )

    # critical | high | medium | low | info
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remediation: Mapped[Optional[str]] = mapped_column(Text)
    evidence_refs: Mapped[Optional[List[str]]] = mapped_column(JSONB)
    needs_human_review: Mapped[bool] = mapped_column(default=False)

    # open | in_remediation | closed | accepted
    status: Mapped[str] = mapped_column(String(32), default="open")
    # pass | fail | partial | not_tested
    validation_result: Mapped[Optional[str]] = mapped_column(String(16))

    run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="findings")
