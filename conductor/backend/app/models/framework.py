from typing import List, Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class Framework(Base, BaseModel):
    __tablename__ = "frameworks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    version: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # builtin | custom | api_sync
    source: Mapped[str] = mapped_column(String(32), default="custom")
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    controls: Mapped[List["Control"]] = relationship(
        "Control", back_populates="framework", cascade="all, delete-orphan"
    )


class Control(Base, BaseModel):
    __tablename__ = "controls"

    framework_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("frameworks.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("controls.id", ondelete="SET NULL")
    )
    ref_code: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # preventive | detective | corrective | directive
    control_type: Mapped[str] = mapped_column(String(32), default="preventive")
    # daily | weekly | monthly | quarterly | annually | continuous
    frequency: Mapped[str] = mapped_column(String(32), default="annually")
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    framework: Mapped["Framework"] = relationship("Framework", back_populates="controls")
    children: Mapped[List["Control"]] = relationship(
        "Control", backref="parent", remote_side="Control.id"
    )
    requirements: Mapped[List["Requirement"]] = relationship(
        "Requirement", back_populates="control", cascade="all, delete-orphan"
    )


class Requirement(Base, BaseModel):
    __tablename__ = "requirements"

    control_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False
    )
    ref_code: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # inspect | interview | test | examine
    test_method: Mapped[str] = mapped_column(String(32), default="test")
    evidence_guidance: Mapped[Optional[str]] = mapped_column(Text)

    control: Mapped["Control"] = relationship("Control", back_populates="requirements")
