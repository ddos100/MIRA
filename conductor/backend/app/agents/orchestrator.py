"""Master Orchestrator — sequences the four specialist agents for a full assessment run."""
from datetime import datetime, timezone
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.models.agent import AgentRun
from app.agents.validator import ControlValidationAgent
from app.agents.collector import EvidenceCollectionAgent
from app.agents.reviewer import ReviewVerificationAgent
from app.agents.reporter import ReportingAgent


class Orchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, run_id: str, scope: Dict) -> Dict:
        """Execute a full orchestration: validate → collect → review → report."""

        await self.db.execute(
            update(AgentRun).where(AgentRun.id == run_id).values(
                status="running",
                started_at=datetime.now(timezone.utc),
                current_agent="orchestrator",
            )
        )
        await self.db.commit()

        results: Dict = {}
        run_type = scope.get("run_type", "full")

        try:
            if run_type in ("full", "validate"):
                agent = ControlValidationAgent(db=self.db, run_id=run_id)
                results["validation"] = await agent.execute(scope)

            if run_type in ("full", "collect"):
                agent = EvidenceCollectionAgent(db=self.db, run_id=run_id)
                results["collection"] = await agent.execute(scope)

            if run_type in ("full", "review"):
                agent = ReviewVerificationAgent(db=self.db, run_id=run_id)
                results["review"] = await agent.execute(scope)

            if run_type in ("full", "report"):
                agent = ReportingAgent(db=self.db, run_id=run_id)
                results["report"] = await agent.execute(scope)

            # Mark run completed
            findings_count = results.get("validation", {}).get("findings_count", 0)
            evidence_collected = results.get("collection", {}).get("evidence_collected", 0)
            compliance_score = results.get("review", {}).get("overall_compliance_score")

            await self.db.execute(
                update(AgentRun).where(AgentRun.id == run_id).values(
                    status="completed",
                    completed_at=datetime.now(timezone.utc),
                    progress_pct=100,
                    current_agent=None,
                    findings_count=findings_count,
                    evidence_collected=evidence_collected,
                    compliance_score=compliance_score,
                )
            )
            await self.db.commit()

        except Exception as exc:
            await self.db.execute(
                update(AgentRun).where(AgentRun.id == run_id).values(
                    status="failed",
                    completed_at=datetime.now(timezone.utc),
                    error_message=str(exc),
                )
            )
            await self.db.commit()
            raise

        return results
