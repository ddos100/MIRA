from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, BaseModel


class Connector(Base, BaseModel):
    __tablename__ = "connectors"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # db | rest_api | ssh | webhook | mira
    connector_type: Mapped[str] = mapped_column(String(32), nullable=False)
    config: Mapped[Optional[Dict]] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # success | failed | untested
    last_test_status: Mapped[str] = mapped_column(String(16), default="untested")
    last_test_message: Mapped[Optional[str]] = mapped_column(Text)

    # Celery beat schedule for auto-sync (cron expression or None)
    sync_schedule: Mapped[Optional[str]] = mapped_column(String(128))

    credentials: Mapped[List["ConnectorCredential"]] = relationship(
        "ConnectorCredential", back_populates="connector", cascade="all, delete-orphan"
    )
    runs: Mapped[List["ConnectorRun"]] = relationship(
        "ConnectorRun", back_populates="connector", cascade="all, delete-orphan"
    )


class ConnectorCredential(Base, BaseModel):
    __tablename__ = "connector_credentials"

    connector_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False
    )
    credential_key: Mapped[str] = mapped_column(String(128), nullable=False)
    # Fernet-encrypted value
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)

    connector: Mapped["Connector"] = relationship("Connector", back_populates="credentials")


class ConnectorRun(Base, BaseModel):
    __tablename__ = "connector_runs"

    connector_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False
    )
    # manual | scheduled | agent
    trigger: Mapped[str] = mapped_column(String(32), default="manual")
    # running | completed | failed
    status: Mapped[str] = mapped_column(String(16), default="running")
    records_collected: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    result_summary: Mapped[Optional[Dict]] = mapped_column(JSONB)

    connector: Mapped["Connector"] = relationship("Connector", back_populates="runs")
