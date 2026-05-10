"""Evidence Collection Agent — gathers and catalogues evidence from all connectors."""
import json
from datetime import datetime, timezone
from typing import Dict, List
from sqlalchemy import select

from app.agents.base_agent import BaseAgent
from app.llm.prompts import EVIDENCE_COLLECTOR_SYSTEM
from app.models.evidence import Evidence, EvidenceTag
from app.models.framework import Requirement
from app.models.integration import Connector
from app.tools.document_search import DocumentSearchTool
from app.tools.db_query import DBQueryTool
from app.tools.api_fetch import APIFetchTool
from app.tools.ssh_exec import SSHExecTool


class EvidenceCollectionAgent(BaseAgent):
    agent_type = "collector"
    system_prompt = EVIDENCE_COLLECTOR_SYSTEM

    def _register_tools(self) -> None:
        self.register_tool(DocumentSearchTool())
        self.register_tool(DBQueryTool(self.db))
        self.register_tool(APIFetchTool(self.db))
        self.register_tool(SSHExecTool(self.db))

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(52, self.agent_type)

        framework_id = scope.get("framework_id")
        requirements_result = await self.db.execute(
            select(Requirement).join(Requirement.control).where(
                # If framework scoped, filter via control → framework
            ) if not framework_id else
            select(Requirement)
        )
        requirements: List[Requirement] = list(requirements_result.scalars())[:20]

        # Load active connectors
        connectors_result = await self.db.execute(
            select(Connector).where(Connector.is_active == True)
        )
        connectors: List[Connector] = list(connectors_result.scalars())
        connector_summary = ", ".join(f"{c.name} ({c.connector_type})" for c in connectors) or "none configured"

        collected = []
        total = max(len(requirements), 1)

        for i, req in enumerate(requirements):
            progress = 52 + int(23 * (i / total))
            await self._update_run_progress(progress, self.agent_type)

            prompt = f"""Collect evidence for this compliance requirement:

Requirement: {req.ref_code} — {req.title}
Description: {req.description or 'N/A'}
Evidence Guidance: {req.evidence_guidance or 'N/A'}
Test Method: {req.test_method}

Available connectors: {connector_summary}

1. Search existing documents with document_search
2. Query connectors if relevant (db_query, api_fetch, ssh_exec)
3. Return a JSON evidence item object."""

            response = await self.run_loop(prompt, max_iterations=5)
            items = self._parse_evidence_items(response, req)

            for item in items:
                evidence = Evidence(
                    title=item.get("title", f"Evidence for {req.ref_code}"),
                    description=item.get("description", ""),
                    source_type=item.get("source_type", "manual"),
                    collected_at=datetime.now(timezone.utc),
                    collected_by="MIRA-Conductor AI",
                    raw_content=item.get("raw_content"),
                    status=item.get("status", "pending"),
                )
                self.db.add(evidence)
                collected.append(item)

        await self.db.commit()
        await self._update_run_progress(75, self.agent_type)

        return {
            "requirements_processed": total,
            "evidence_collected": len(collected),
            "items": collected,
        }

    def _parse_evidence_items(self, response: str, req: Requirement) -> List[Dict]:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > 0:
                data = json.loads(response[start:end])
                if "requirement_ref" in data or "title" in data:
                    return [data]
        except Exception:
            pass
        return [{
            "requirement_ref": req.ref_code,
            "title": f"Evidence search: {req.ref_code}",
            "description": response[:500] if response else "No evidence found",
            "source_type": "manual",
            "status": "missing",
        }]
