"""Reports API — generate, list, preview, download."""
import os
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.report import Report, ReportSection, ReportExport
from app.tasks.report_tasks import export_report_pdf

router = APIRouter(prefix="/reports", tags=["Reports"])


class GenerateReportRequest(BaseModel):
    run_id: str
    report_type: str = "audit"
    framework_id: Optional[str] = None


@router.get("/")
async def list_reports(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).order_by(Report.created_at.desc()).offset(skip).limit(limit))
    return [_report_to_dict(r) for r in result.scalars()]


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    sections_result = await db.execute(
        select(ReportSection).where(ReportSection.report_id == report_id)
        .order_by(ReportSection.section_order)
    )
    sections = sections_result.scalars().all()

    exports_result = await db.execute(select(ReportExport).where(ReportExport.report_id == report_id))
    exports = exports_result.scalars().all()

    return {
        **_report_to_dict(report),
        "sections": [{"title": s.title, "content": s.content, "order": s.section_order} for s in sections],
        "exports": [{"id": e.id, "format": e.format, "file_size": e.file_size, "created_at": str(e.created_at)} for e in exports],
    }


@router.get("/{report_id}/export/{fmt}")
async def download_report(report_id: str, fmt: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Check if export already exists
    export_result = await db.execute(
        select(ReportExport).where(ReportExport.report_id == report_id, ReportExport.format == fmt)
    )
    export = export_result.scalar_one_or_none()

    if export and export.file_path and os.path.exists(export.file_path):
        return FileResponse(export.file_path, filename=f"report_{report_id[:8]}.{fmt}")

    if fmt == "pdf":
        file_path = export_report_pdf.delay(report_id).get(timeout=60)
        if file_path and os.path.exists(file_path):
            return FileResponse(file_path, filename=f"report_{report_id[:8]}.pdf")

    raise HTTPException(status_code=202, detail="Export is being generated, try again shortly")


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()


def _report_to_dict(r: Report) -> dict:
    return {
        "id": r.id, "title": r.title, "report_type": r.report_type,
        "status": r.status, "compliance_score": r.compliance_score,
        "findings_summary": r.findings_summary,
        "generated_at": str(r.generated_at) if r.generated_at else None,
        "generated_by": r.generated_by,
    }
