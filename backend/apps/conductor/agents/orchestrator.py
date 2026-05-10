"""
Orchestrator — sequences agents based on run_type.
Handles all status updates and error recovery.
"""
import asyncio
import logging
from typing import Dict

from django.utils import timezone

from apps.conductor.models import AiAgentRun
from apps.conductor.services.connector_factory import build_connector

logger = logging.getLogger(__name__)

AGENT_SEQUENCE = {
    "full": ["validator", "collector", "reviewer", "reporter"],
    "validate": ["validator"],
    "collect": ["collector"],
    "review": ["reviewer"],
    "report": ["reporter"],
}


class Orchestrator:
    async def run(self, run_id: str, scope: Dict) -> None:
        run = await asyncio.to_thread(AiAgentRun.objects.select_related("framework").get, id=run_id)
        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=run_id).update,
            status="running",
            started_at=timezone.now(),
            progress_pct=5,
        )

        # Load connectors
        connectors = await asyncio.to_thread(self._load_connectors)

        sequence = AGENT_SEQUENCE.get(run.run_type, AGENT_SEQUENCE["full"])
        result: Dict = {}
        warnings = []

        for agent_name in sequence:
            logger.info("[Orchestrator] Starting agent: %s for run %s", agent_name, run_id)
            try:
                agent = self._build_agent(agent_name, run_id, connectors)
                agent_result = await agent.execute(scope)
                result[agent_name] = agent_result
            except Exception as exc:
                logger.error("[Orchestrator] Agent %s failed: %s", agent_name, exc)
                warnings.append(f"{agent_name}: {exc}")
                result[agent_name] = {"error": str(exc)}

        final_status = "completed_with_warnings" if warnings else "completed"
        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=run_id).update,
            status=final_status,
            progress_pct=100,
            completed_at=timezone.now(),
            current_agent="",
            error_message="; ".join(warnings) if warnings else "",
        )
        logger.info("[Orchestrator] Run %s completed: %s", run_id, final_status)

    def _load_connectors(self):
        from apps.conductor.models import AiConnector
        pairs = []
        for connector in AiConnector.objects.filter(is_active=True).prefetch_related("credentials"):
            instance = build_connector(connector)
            if instance:
                pairs.append((connector, instance))
        return pairs

    def _build_agent(self, agent_name: str, run_id: str, connectors):
        if agent_name == "validator":
            from apps.conductor.agents.validator import ControlValidationAgent
            return ControlValidationAgent(run_id, connectors)
        elif agent_name == "collector":
            from apps.conductor.agents.collector import EvidenceCollectionAgent
            return EvidenceCollectionAgent(run_id, connectors)
        elif agent_name == "reviewer":
            from apps.conductor.agents.reviewer import ReviewVerificationAgent
            return ReviewVerificationAgent(run_id)
        elif agent_name == "reporter":
            from apps.conductor.agents.reporter import ReportingAgent
            return ReportingAgent(run_id)
        raise ValueError(f"Unknown agent: {agent_name}")
