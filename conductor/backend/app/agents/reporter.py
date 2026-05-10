"""Reporting Agent — generates executive summaries, audit reports, and remediation plans."""
import json
from datetime import datetime, timezone
from typing import Dict, List
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select, update
import os

from app.agents.base_agent import BaseAgent
from app.llm.prompts import REPORTER_SYSTEM
from app.models.agent import AgentFinding, AgentRun
from app.models.report import Report, ReportExport, ReportSection


REPORT_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")


class ReportingAgent(BaseAgent):
    agent_type = "reporter"
    system_prompt = REPORTER_SYSTEM

    def _register_tools(self) -> None:
        pass  # Reporter uses LLM directly — no external tools needed

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(95, self.agent_type)

        # Load run data
        run_result = await self.db.execute(
            select(AgentRun).where(AgentRun.id == self.run_id)
        )
        run = run_result.scalar_one_or_none()

        findings_result = await self.db.execute(
            select(AgentFinding).where(AgentFinding.run_id == self.run_id)
        )
        findings: List[AgentFinding] = list(findings_result.scalars())

        # Summarize findings for LLM
        findings_summary = self._summarize_findings(findings)

        # Generate executive summary
        exec_summary = await self.ollama.generate(
            prompt=f"""Generate a professional executive summary for this cybersecurity compliance assessment:

Compliance Score: {run.compliance_score or 'N/A'}%
Total Findings: {len(findings)}
Critical: {sum(1 for f in findings if f.severity == 'critical')}
High: {sum(1 for f in findings if f.severity == 'high')}
Medium: {sum(1 for f in findings if f.severity == 'medium')}
Low: {sum(1 for f in findings if f.severity == 'low')}
Needs Human Review: {sum(1 for f in findings if f.needs_human_review)}

Key Findings:
{findings_summary[:2000]}

Write 3-5 clear bullet points suitable for a CISO or board audience.
Include the overall risk posture and top priority actions.""",
            system=self.system_prompt,
            temperature=0.2,
        )

        # Generate remediation plan
        remediation = await self.ollama.generate(
            prompt=f"""Generate a prioritized remediation roadmap for these findings:

{findings_summary[:3000]}

For each critical and high finding, provide:
1. Specific remediation steps
2. Suggested owner (e.g., Security Team, IT Admin, DevOps)
3. Suggested timeline (immediate/30 days/90 days)
4. Resource estimate (low/medium/high effort)

Format as a structured action plan.""",
            system=self.system_prompt,
            temperature=0.15,
        )

        # Create Report record
        report = Report(
            title=f"Compliance Assessment Report — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
            report_type=scope.get("report_type", "audit"),
            run_id=self.run_id,
            framework_id=scope.get("framework_id"),
            status="ready",
            generated_at=datetime.now(timezone.utc),
            compliance_score=run.compliance_score,
            summary=exec_summary[:2000],
            findings_summary={
                "total": len(findings),
                "by_severity": {
                    "critical": sum(1 for f in findings if f.severity == "critical"),
                    "high": sum(1 for f in findings if f.severity == "high"),
                    "medium": sum(1 for f in findings if f.severity == "medium"),
                    "low": sum(1 for f in findings if f.severity == "low"),
                },
            },
        )
        self.db.add(report)
        await self.db.flush()

        # Add sections
        sections = [
            ReportSection(report_id=report.id, section_order=1, title="Executive Summary", content=exec_summary),
            ReportSection(report_id=report.id, section_order=2, title="Assessment Scope & Methodology", content=self._scope_section(scope, run)),
            ReportSection(report_id=report.id, section_order=3, title="Findings Summary", content=findings_summary),
            ReportSection(report_id=report.id, section_order=4, title="Remediation Roadmap", content=remediation),
        ]
        for section in sections:
            self.db.add(section)

        await self.db.commit()
        await self._update_run_progress(100, self.agent_type)

        return {
            "report_id": report.id,
            "title": report.title,
            "compliance_score": report.compliance_score,
            "findings_count": len(findings),
        }

    def _summarize_findings(self, findings: List[AgentFinding]) -> str:
        if not findings:
            return "No findings recorded."
        lines = []
        for f in sorted(findings, key=lambda x: ["critical", "high", "medium", "low"].index(x.severity) if x.severity in ["critical", "high", "medium", "low"] else 99):
            lines.append(f"[{f.severity.upper()}] {f.title}: {f.description[:200]}")
        return "\n".join(lines)

    def _scope_section(self, scope: Dict, run: AgentRun) -> str:
        return (
            f"Assessment Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"
            f"Assessor: MIRA-Conductor AI Agent\n"
            f"Run ID: {self.run_id}\n"
            f"Scope: {json.dumps(scope)}\n"
            f"Run Type: {run.run_type}\n"
            f"Triggered By: {run.triggered_by}"
        )
