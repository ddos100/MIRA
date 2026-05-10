"""Review & Verification Agent — LLM-powered analysis of evidence against requirements."""
import json
from datetime import datetime, timezone
from typing import Dict, List
from sqlalchemy import select, update

from app.agents.base_agent import BaseAgent
from app.llm.prompts import REVIEW_VERIFIER_SYSTEM
from app.models.agent import AgentRun
from app.models.evidence import Evidence
from app.tools.document_search import DocumentSearchTool


class ReviewVerificationAgent(BaseAgent):
    agent_type = "reviewer"
    system_prompt = REVIEW_VERIFIER_SYSTEM

    def _register_tools(self) -> None:
        self.register_tool(DocumentSearchTool())

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(76, self.agent_type)

        # Load recent evidence for this run
        evidence_result = await self.db.execute(
            select(Evidence)
            .where(Evidence.status == "pending")
            .order_by(Evidence.created_at.desc())
            .limit(50)
        )
        evidence_items: List[Evidence] = list(evidence_result.scalars())

        assessments = []
        scores = []
        needs_review_count = 0
        total = max(len(evidence_items), 1)

        for i, ev in enumerate(evidence_items):
            progress = 76 + int(18 * (i / total))
            await self._update_run_progress(progress, self.agent_type)

            content_preview = (ev.raw_content or "")[:1500] or "(file-based evidence)"
            prompt = f"""Review this evidence item for compliance:

Evidence Title: {ev.title}
Source: {ev.source_type}
Description: {ev.description or 'N/A'}
Content Preview:
{content_preview}

Search for the relevant compliance requirement text with document_search.
Assess whether this evidence satisfies compliance requirements.
Return a JSON assessment object."""

            response = await self.run_loop(prompt, max_iterations=4)
            assessment = self._parse_assessment(response, ev)
            assessments.append(assessment)

            score = assessment.get("score", 50)
            scores.append(score)

            if assessment.get("needs_human_review"):
                needs_review_count += 1

            # Update evidence status based on verdict
            verdict = assessment.get("verdict", "PARTIAL")
            new_status = {"SUFFICIENT": "verified", "INSUFFICIENT": "rejected"}.get(verdict, "pending")
            await self.db.execute(
                update(Evidence).where(Evidence.id == ev.id).values(status=new_status)
            )

        await self.db.commit()

        overall_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        # Update AgentRun compliance score
        await self.db.execute(
            update(AgentRun).where(AgentRun.id == self.run_id).values(
                compliance_score=overall_score
            )
        )
        await self.db.commit()
        await self._update_run_progress(94, self.agent_type)

        return {
            "evidence_reviewed": len(evidence_items),
            "overall_compliance_score": overall_score,
            "needs_human_review": needs_review_count,
            "assessments": assessments,
        }

    def _parse_assessment(self, response: str, ev: Evidence) -> Dict:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > 0:
                data = json.loads(response[start:end])
                if "verdict" in data or "score" in data:
                    return data
        except Exception:
            pass
        return {
            "evidence_id": ev.id,
            "verdict": "PARTIAL",
            "score": 50,
            "reasoning": response[:300] if response else "Review incomplete",
            "needs_human_review": True,
        }
