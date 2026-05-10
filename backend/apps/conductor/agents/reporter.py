"""Reporting Agent — generates AI reports linked to MIRA."""
import asyncio
import logging
from typing import Dict

from django.utils import timezone

from apps.conductor.agents.base_agent import BaseAgent
from apps.conductor.llm.prompts import REPORTER_SYSTEM
from apps.conductor.models import AiAgentFinding, AiAgentRun, AiReport, AiReportSection

logger = logging.getLogger(__name__)


class ReportingAgent(BaseAgent):
    agent_type = "reporter"

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(80, "reporter")
        run = await asyncio.to_thread(AiAgentRun.objects.select_related("framework").get, id=self.run_id)
        findings = await asyncio.to_thread(self._get_findings)

        severity_summary: Dict[str, int] = {}
        for f in findings:
            severity_summary[f.severity] = severity_summary.get(f.severity, 0) + 1

        findings_text = "\n".join(
            f"[{f.severity.upper()}] {f.title}: {f.description[:200]}" for f in findings[:20]
        )
        prompt = (
            f"Framework: {run.framework.name if run.framework_id else 'General'}\n"
            f"Compliance Score: {run.compliance_score or 'N/A'}%\n"
            f"Total Findings: {len(findings)}\n"
            f"By Severity: {severity_summary}\n\n"
            f"Top Findings:\n{findings_text}\n\n"
            f"Generate a professional compliance report."
        )

        report_content = await self.ollama.generate(prompt, system=REPORTER_SYSTEM, temperature=0.3)

        # Create remediation plan
        rem_prompt = (
            f"Based on these findings, create a prioritised remediation roadmap:\n{findings_text}\n"
            f"Focus on quick wins (low effort, high impact) first."
        )
        remediation_content = await self.ollama.generate(rem_prompt, system=REPORTER_SYSTEM, temperature=0.3)

        report_id = await asyncio.to_thread(
            self._create_report, run, report_content, remediation_content, severity_summary
        )
        return {"report_id": str(report_id)}

    def _get_findings(self):
        return list(AiAgentFinding.objects.filter(run_id=self.run_id).order_by("-severity"))

    def _create_report(self, run: AiAgentRun, content: str, remediation: str, severity_summary: dict) -> str:
        fw_name = run.framework.name if run.framework_id else "General Assessment"
        report = AiReport.objects.create(
            run=run,
            framework=run.framework,
            title=f"AI Compliance Report: {fw_name}",
            report_type="audit",
            status="ready",
            generated_at=timezone.now(),
            compliance_score=run.compliance_score,
            findings_summary={"by_severity": severity_summary, "total": sum(severity_summary.values())},
        )
        AiReportSection.objects.create(report=report, section_order=1, title="Executive Summary", content=content[:10000])
        AiReportSection.objects.create(report=report, section_order=2, title="Remediation Roadmap", content=remediation[:10000])
        return report.id
