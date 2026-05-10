"""Async report generation tasks."""
import asyncio
from app.tasks.celery_app import celery_app


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.report_tasks.export_report_pdf")
def export_report_pdf(report_id: str) -> str:
    """Generate PDF export for a completed report."""
    from app.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.report import Report, ReportSection, ReportExport
    from app.config import get_settings
    import os
    from datetime import datetime, timezone

    settings = get_settings()

    async def _inner():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Report).where(Report.id == report_id))
            report = result.scalar_one_or_none()
            if not report:
                return None

            sections_result = await db.execute(
                select(ReportSection).where(ReportSection.report_id == report_id)
                .order_by(ReportSection.section_order)
            )
            sections = list(sections_result.scalars())

            # Build HTML content for WeasyPrint
            html = _build_report_html(report, sections)

            out_dir = os.path.join(settings.upload_dir, "reports", report_id)
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, f"report_{report_id[:8]}.pdf")

            try:
                from weasyprint import HTML
                HTML(string=html).write_pdf(out_path)
            except ImportError:
                # WeasyPrint not available — save HTML instead
                out_path = out_path.replace(".pdf", ".html")
                with open(out_path, "w") as f:
                    f.write(html)

            file_size = os.path.getsize(out_path)
            export_fmt = "pdf" if out_path.endswith(".pdf") else "html"
            export = ReportExport(
                report_id=report_id,
                format=export_fmt,
                file_path=out_path,
                file_size=file_size,
            )
            db.add(export)
            await db.commit()
            return out_path

    return _run_async(_inner())


def _build_report_html(report, sections) -> str:
    sections_html = "".join(
        f"<section><h2>{s.title}</h2><pre>{s.content or ''}</pre></section>"
        for s in sections
    )
    score = f"{report.compliance_score:.1f}%" if report.compliance_score is not None else "N/A"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{report.title}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #222; }}
    h1 {{ color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 8px; }}
    h2 {{ color: #2c5282; margin-top: 32px; }}
    .score {{ font-size: 2em; color: #276749; font-weight: bold; }}
    .meta {{ color: #666; font-size: 0.9em; }}
    pre {{ background: #f7f7f7; padding: 16px; border-radius: 4px; white-space: pre-wrap; }}
    section {{ margin-bottom: 32px; }}
  </style>
</head>
<body>
  <h1>{report.title}</h1>
  <p class="meta">Generated: {report.generated_at} | By: {report.generated_by}</p>
  <p>Overall Compliance Score: <span class="score">{score}</span></p>
  {sections_html}
</body>
</html>"""
