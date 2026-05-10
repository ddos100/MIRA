"""Agents API — trigger runs, stream status, list history, findings."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import asyncio
import json
from datetime import datetime, timezone

from app.database import get_db
from app.models.agent import AgentRun, AgentStep, AgentFinding
from app.tasks.agent_tasks import run_orchestration

router = APIRouter(prefix="/agents", tags=["Agents"])


class RunRequest(BaseModel):
    run_type: str = "full"
    framework_id: Optional[str] = None
    control_ids: Optional[List[str]] = None
    triggered_by: str = "manual"


class RunOut(BaseModel):
    id: str
    run_type: str
    status: str
    progress_pct: int
    current_agent: Optional[str]
    compliance_score: Optional[float]
    findings_count: int
    evidence_collected: int
    started_at: Optional[str]
    completed_at: Optional[str]
    error_message: Optional[str]

    class Config:
        from_attributes = True


@router.post("/run", status_code=201)
async def trigger_run(body: RunRequest, db: AsyncSession = Depends(get_db)):
    scope = {
        "run_type": body.run_type,
        "framework_id": body.framework_id,
        "control_ids": body.control_ids,
    }
    run = AgentRun(
        run_type=body.run_type,
        scope=scope,
        triggered_by=body.triggered_by,
        framework_id=body.framework_id,
        status="pending",
        progress_pct=0,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Dispatch to Celery
    run_orchestration.delay(run.id, scope)

    return {"run_id": run.id, "status": run.status, "message": "Orchestration run started"}


@router.get("/runs")
async def list_runs(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(AgentRun).order_by(AgentRun.created_at.desc()).offset(skip).limit(limit)
    if status:
        query = query.where(AgentRun.status == status)
    result = await db.execute(query)
    runs = result.scalars().all()
    return [_run_to_dict(r) for r in runs]


@router.get("/runs/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    steps_result = await db.execute(select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.step_number))
    steps = steps_result.scalars().all()

    findings_result = await db.execute(select(AgentFinding).where(AgentFinding.run_id == run_id))
    findings = findings_result.scalars().all()

    return {
        **_run_to_dict(run),
        "steps": [{"id": s.id, "agent_type": s.agent_type, "step_number": s.step_number,
                   "action": s.action, "tool_used": s.tool_used, "result": s.result,
                   "duration_ms": s.duration_ms, "created_at": str(s.created_at)} for s in steps],
        "findings": [_finding_to_dict(f) for f in findings],
    }


@router.get("/runs/{run_id}/stream")
async def stream_run_status(run_id: str, db: AsyncSession = Depends(get_db)):
    """Server-Sent Events stream for live agent run updates."""
    async def event_generator():
        last_step_count = 0
        for _ in range(300):  # max 300 * 2s = 10 minutes
            result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
            run = result.scalar_one_or_none()
            if not run:
                break

            steps_result = await db.execute(
                select(AgentStep).where(AgentStep.run_id == run_id)
                .order_by(AgentStep.step_number).offset(last_step_count)
            )
            new_steps = steps_result.scalars().all()
            last_step_count += len(new_steps)

            data = {
                "run": _run_to_dict(run),
                "new_steps": [{"action": s.action, "agent_type": s.agent_type, "result": s.result} for s in new_steps],
            }
            yield f"data: {json.dumps(data)}\n\n"

            if run.status in ("completed", "failed", "cancelled"):
                break
            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(AgentRun).where(AgentRun.id == run_id, AgentRun.status == "running")
        .values(status="cancelled", completed_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"message": "Cancellation requested"}


@router.get("/findings")
async def list_findings(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    run_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(AgentFinding).order_by(AgentFinding.created_at.desc()).offset(skip).limit(limit)
    if severity:
        query = query.where(AgentFinding.severity == severity)
    if status:
        query = query.where(AgentFinding.status == status)
    if run_id:
        query = query.where(AgentFinding.run_id == run_id)
    result = await db.execute(query)
    return [_finding_to_dict(f) for f in result.scalars()]


def _run_to_dict(r: AgentRun) -> dict:
    return {
        "id": r.id, "run_type": r.run_type, "status": r.status,
        "progress_pct": r.progress_pct, "current_agent": r.current_agent,
        "compliance_score": r.compliance_score, "findings_count": r.findings_count,
        "evidence_collected": r.evidence_collected,
        "started_at": str(r.started_at) if r.started_at else None,
        "completed_at": str(r.completed_at) if r.completed_at else None,
        "error_message": r.error_message,
    }


def _finding_to_dict(f: AgentFinding) -> dict:
    return {
        "id": f.id, "run_id": f.run_id, "severity": f.severity,
        "title": f.title, "description": f.description,
        "remediation": f.remediation, "status": f.status,
        "validation_result": f.validation_result,
        "needs_human_review": f.needs_human_review,
        "control_id": f.control_id, "created_at": str(f.created_at),
    }
