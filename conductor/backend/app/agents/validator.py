"""Control Validation Agent — tests controls against framework requirements."""
import json
from datetime import datetime, timezone
from typing import Dict, List
from sqlalchemy import select, update

from app.agents.base_agent import BaseAgent
from app.llm.prompts import CONTROL_VALIDATOR_SYSTEM
from app.models.agent import AgentFinding, AgentRun
from app.models.framework import Control, Framework
from app.tools.document_search import DocumentSearchTool
from app.tools.db_query import DBQueryTool
from app.tools.api_fetch import APIFetchTool
from app.tools.ssh_exec import SSHExecTool


class ControlValidationAgent(BaseAgent):
    agent_type = "validator"
    system_prompt = CONTROL_VALIDATOR_SYSTEM

    def _register_tools(self) -> None:
        self.register_tool(DocumentSearchTool())
        self.register_tool(DBQueryTool(self.db))
        self.register_tool(APIFetchTool(self.db))
        self.register_tool(SSHExecTool(self.db))

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(5, self.agent_type)

        framework_id = scope.get("framework_id")
        control_ids = scope.get("control_ids")

        # Load controls to validate
        query = select(Control)
        if control_ids:
            query = query.where(Control.id.in_(control_ids))
        elif framework_id:
            query = query.where(Control.framework_id == framework_id)

        result = await self.db.execute(query)
        controls: List[Control] = list(result.scalars())

        findings = []
        total = len(controls)

        for i, control in enumerate(controls):
            progress = 5 + int(45 * (i / max(total, 1)))
            await self._update_run_progress(progress, self.agent_type)

            prompt = f"""Validate this security control:

Control Reference: {control.ref_code}
Title: {control.title}
Description: {control.description or 'N/A'}
Type: {control.control_type}
Frequency: {control.frequency}

Use document_search to find relevant evidence or policy documents.
Use db_query, api_fetch, or ssh_exec if connectors are available for technical validation.
Return a JSON finding object."""

            response = await self.run_loop(prompt, max_iterations=6)

            # Parse findings from response
            parsed = self._parse_findings(response, control)
            for finding_data in parsed:
                finding = AgentFinding(
                    run_id=self.run_id,
                    control_id=control.id,
                    severity=finding_data.get("severity", "medium"),
                    title=finding_data.get("title", f"Finding for {control.ref_code}"),
                    description=finding_data.get("description", response[:500]),
                    remediation=finding_data.get("remediation", ""),
                    evidence_refs=finding_data.get("evidence_refs", []),
                    needs_human_review=finding_data.get("needs_human_review", False),
                    validation_result=finding_data.get("result", "NOT_TESTED"),
                    status="open" if finding_data.get("result") == "FAIL" else "closed",
                )
                self.db.add(finding)
                findings.append(finding_data)

        await self.db.commit()
        await self._update_run_progress(50, self.agent_type)

        return {
            "controls_assessed": total,
            "findings_count": len(findings),
            "findings": findings,
        }

    def _parse_findings(self, response: str, control: Control) -> List[Dict]:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > 0:
                data = json.loads(response[start:end])
                if "control_ref" in data:
                    return [data]
                if isinstance(data, list):
                    return data
        except Exception:
            pass
        # Fallback: create a generic NOT_TESTED finding
        return [{
            "control_ref": control.ref_code,
            "result": "NOT_TESTED",
            "severity": "info",
            "title": f"Could not validate: {control.ref_code}",
            "description": response[:500] if response else "No response from agent",
            "needs_human_review": True,
        }]
