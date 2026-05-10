"""Evidence Collection Agent — gathers evidence from connected sources."""
import asyncio
import json
import logging
from typing import Dict

from apps.conductor.agents.base_agent import BaseAgent
from apps.conductor.llm.prompts import EVIDENCE_COLLECTOR_SYSTEM
from apps.conductor.models import AiAgentRun

logger = logging.getLogger(__name__)


class EvidenceCollectionAgent(BaseAgent):
    agent_type = "collector"

    def __init__(self, run_id: str, connectors=None):
        super().__init__(run_id)
        self.connectors = connectors or []

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(40, "collector")
        run = await asyncio.to_thread(AiAgentRun.objects.get, id=self.run_id)

        # Run connector collection in parallel
        all_evidence = []
        for connector_obj, conn_instance in self.connectors:
            if connector_obj.connector_type == "webhook":
                continue
            try:
                items = await conn_instance.collect()
                all_evidence.extend(items)
            except Exception as exc:
                logger.error("Connector %s collect failed: %s", connector_obj.name, exc)

        prompt = (
            f"Collected {len(all_evidence)} pieces of evidence from connectors.\n"
            f"Evidence sample: {json.dumps(all_evidence[:3], default=str)[:1000]}\n"
            f"Framework: {run.framework.name if run.framework_id else 'Not specified'}\n"
            f"Summarise the evidence and note any gaps."
        )
        await self.run_loop(prompt, EVIDENCE_COLLECTOR_SYSTEM, max_iterations=5)

        # Update evidence count
        count = len(all_evidence)
        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=self.run_id).update,
            evidence_collected=count,
        )
        return {"evidence_collected": count}
