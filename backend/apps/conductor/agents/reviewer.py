"""Review & Verification Agent — reviews findings and calculates compliance score."""
import asyncio
import logging
from typing import Dict

from apps.conductor.agents.base_agent import BaseAgent
from apps.conductor.llm.prompts import REVIEW_VERIFIER_SYSTEM
from apps.conductor.models import AiAgentFinding, AiAgentRun

logger = logging.getLogger(__name__)


class ReviewVerificationAgent(BaseAgent):
    agent_type = "reviewer"

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(65, "reviewer")

        findings = await asyncio.to_thread(self._get_findings)
        if not findings:
            return {"score": None, "reviewed": 0}

        # Build summary for LLM review
        summary = "\n".join(
            f"- [{f.severity}] {f.title}: {f.validation_result}" for f in findings
        )
        prompt = (
            f"Review these AI-generated compliance findings and assess overall compliance:\n\n{summary}\n\n"
            f"Consider: severity distribution, pass/fail ratio, coverage. Calculate a 0-100 compliance score."
        )

        self._score = None
        await self.run_loop(prompt, REVIEW_VERIFIER_SYSTEM, max_iterations=4)

        # Calculate score from findings if LLM didn't set one
        if self._score is None:
            self._score = self._calculate_score(findings)

        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=self.run_id).update,
            compliance_score=self._score,
        )
        return {"score": self._score, "reviewed": len(findings)}

    async def _run_tool(self, tool_name: str, args: dict) -> str:
        if tool_name == "set_score":
            self._score = float(args.get("score", 0))
            return f"Score set to {self._score}"
        return await super()._run_tool(tool_name, args)

    def _get_findings(self):
        return list(AiAgentFinding.objects.filter(run_id=self.run_id))

    def _calculate_score(self, findings) -> float:
        if not findings:
            return 100.0
        weights = {"critical": 20, "high": 10, "medium": 5, "low": 2, "info": 0}
        deductions = sum(weights.get(f.severity, 5) for f in findings if f.validation_result == "fail")
        return max(0.0, min(100.0, 100.0 - deductions))
