"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # frameworks
    op.create_table(
        "frameworks",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("short_code", sa.String(64), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(32), nullable=False, server_default="custom"),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_code"),
    )

    # controls
    op.create_table(
        "controls",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("framework_id", sa.String(36), nullable=False),
        sa.Column("parent_id", sa.String(36), nullable=True),
        sa.Column("ref_code", sa.String(128), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("control_type", sa.String(32), nullable=False, server_default="preventive"),
        sa.Column("frequency", sa.String(32), nullable=False, server_default="annually"),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["framework_id"], ["frameworks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["controls.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # requirements
    op.create_table(
        "requirements",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("control_id", sa.String(36), nullable=False),
        sa.Column("ref_code", sa.String(128), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("test_method", sa.String(32), nullable=False, server_default="test"),
        sa.Column("evidence_guidance", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["control_id"], ["controls.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # connectors
    op.create_table(
        "connectors",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("connector_type", sa.String(32), nullable=False),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_test_status", sa.String(16), nullable=False, server_default="untested"),
        sa.Column("last_test_message", sa.Text(), nullable=True),
        sa.Column("sync_schedule", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # connector_credentials
    op.create_table(
        "connector_credentials",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("connector_id", sa.String(36), nullable=False),
        sa.Column("credential_key", sa.String(128), nullable=False),
        sa.Column("encrypted_value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["connectors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # connector_runs
    op.create_table(
        "connector_runs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("connector_id", sa.String(36), nullable=False),
        sa.Column("trigger", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column("records_collected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("result_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["connectors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # evidence
    op.create_table(
        "evidence",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("connector_id", sa.String(36), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collected_by", sa.String(255), nullable=True),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("file_name", sa.String(512), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(128), nullable=True),
        sa.Column("sha256_hash", sa.String(64), nullable=True),
        sa.Column("hash_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hash_valid", sa.Boolean(), nullable=True),
        sa.Column("raw_content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["connectors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # evidence_tags
    op.create_table(
        "evidence_tags",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("evidence_id", sa.String(36), nullable=False),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column("value", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # control_evidence
    op.create_table(
        "control_evidence",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("evidence_id", sa.String(36), nullable=False),
        sa.Column("control_id", sa.String(36), nullable=True),
        sa.Column("requirement_id", sa.String(36), nullable=True),
        sa.Column("relevance_score", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["control_id"], ["controls.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # agent_runs
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_type", sa.String(32), nullable=False, server_default="full"),
        sa.Column("scope", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("triggered_by", sa.String(64), nullable=False, server_default="manual"),
        sa.Column("triggered_by_user", sa.String(255), nullable=True),
        sa.Column("framework_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("current_agent", sa.String(64), nullable=True),
        sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("compliance_score", sa.Float(), nullable=True),
        sa.Column("findings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("evidence_collected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["framework_id"], ["frameworks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # agent_steps
    op.create_table(
        "agent_steps",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("agent_type", sa.String(32), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("tool_used", sa.String(128), nullable=True),
        sa.Column("input_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("output_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("result", sa.String(32), nullable=False, server_default="success"),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # agent_findings
    op.create_table(
        "agent_findings",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("control_id", sa.String(36), nullable=True),
        sa.Column("requirement_id", sa.String(36), nullable=True),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("remediation", sa.Text(), nullable=True),
        sa.Column("evidence_refs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("needs_human_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("validation_result", sa.String(16), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["control_id"], ["controls.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # documents
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("sha256_hash", sa.String(64), nullable=True),
        sa.Column("parse_status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parse_error", sa.Text(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(32), nullable=False, server_default="upload"),
        sa.Column("uploaded_by", sa.String(255), nullable=True),
        sa.Column("doc_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # document_chunks
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("document_id", sa.String(36), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("chroma_id", sa.String(128), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("chunk_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # reports
    op.create_table(
        "reports",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("report_type", sa.String(32), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=True),
        sa.Column("framework_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="generating"),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("generated_by", sa.String(255), nullable=False, server_default="MIRA-Conductor AI"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("compliance_score", sa.Float(), nullable=True),
        sa.Column("findings_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["framework_id"], ["frameworks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # report_sections
    op.create_table(
        "report_sections",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("report_id", sa.String(36), nullable=False),
        sa.Column("section_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("section_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # report_exports
    op.create_table(
        "report_exports",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("report_id", sa.String(36), nullable=False),
        sa.Column("format", sa.String(16), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # indexes
    op.create_index("ix_controls_framework_id", "controls", ["framework_id"])
    op.create_index("ix_requirements_control_id", "requirements", ["control_id"])
    op.create_index("ix_evidence_status", "evidence", ["status"])
    op.create_index("ix_evidence_source_type", "evidence", ["source_type"])
    op.create_index("ix_agent_runs_status", "agent_runs", ["status"])
    op.create_index("ix_agent_runs_framework_id", "agent_runs", ["framework_id"])
    op.create_index("ix_agent_steps_run_id", "agent_steps", ["run_id"])
    op.create_index("ix_agent_findings_run_id", "agent_findings", ["run_id"])
    op.create_index("ix_agent_findings_severity", "agent_findings", ["severity"])
    op.create_index("ix_documents_parse_status", "documents", ["parse_status"])
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("ix_connector_runs_connector_id", "connector_runs", ["connector_id"])
    op.create_index("ix_reports_run_id", "reports", ["run_id"])


def downgrade() -> None:
    op.drop_table("report_exports")
    op.drop_table("report_sections")
    op.drop_table("reports")
    op.drop_table("document_chunks")
    op.drop_table("documents")
    op.drop_table("agent_findings")
    op.drop_table("agent_steps")
    op.drop_table("agent_runs")
    op.drop_table("control_evidence")
    op.drop_table("evidence_tags")
    op.drop_table("evidence")
    op.drop_table("connector_runs")
    op.drop_table("connector_credentials")
    op.drop_table("connectors")
    op.drop_table("requirements")
    op.drop_table("controls")
    op.drop_table("frameworks")
