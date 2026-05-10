"""
Control Validation Agent — validates MIRA controls against framework requirements.
Uses document_search, db_query, api_fetch, ssh_exec tools.
"""
import asyncio
import json
import logging
from typing import Dict, List

from apps.conductor.agents.base_agent import BaseAgent
from apps.conductor.llm.prompts import CONTROL_VALIDATOR_SYSTEM
from apps.conductor.models import AiAgentFinding, AiAgentRun

logger = logging.getLogger(__name__)


class ControlValidationAgent(BaseAgent):
    agent_type = "validator"

    def __init__(self, run_id: str, connectors=None):
        super().__init__(run_id)
        self.connectors = connectors or []  # list of (AiConnector, BaseConnector instance)

    async def execute(self, scope: Dict) -> Dict:
        await self._update_run_progress(10, "validator")
        run = await asyncio.to_thread(AiAgentRun.objects.get, id=self.run_id)

        controls = await asyncio.to_thread(self._get_controls, run)
        if not controls:
            return {"status": "skipped", "reason": "No controls found for the given scope"}

        findings = []
        for i, control in enumerate(controls):
            await self._update_run_progress(10 + int((i / len(controls)) * 30))
            finding_data = await self._validate_control(control)
            findings.extend(finding_data)

        count = await asyncio.to_thread(self._save_findings, findings)
        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=self.run_id).update,
            findings_count=count,
        )
        return {"findings_created": count}

    def _get_controls(self, run: AiAgentRun) -> list:
        from apps.controls.models import Control
        qs = Control.objects.filter(status="active")
        if run.framework_id:
            qs = qs.filter(compliance_requirements__framework=run.framework)
        return list(qs.select_related("category")[:50])  # cap at 50 controls

    async def _validate_control(self, control) -> List[dict]:
        prompt = (
            f"Validate control: '{control.title}'\n"
            f"Type: {control.control_type}, Frequency: {control.frequency}\n"
            f"Description: {control.description}\n\n"
            f"Search for evidence that this control is implemented and effective. "
            f"Report any gaps found."
        )
        self._findings_buffer: List[dict] = []
        await self.run_loop(prompt, CONTROL_VALIDATOR_SYSTEM, max_iterations=8)
        result = list(self._findings_buffer)
        self._findings_buffer = []
        # Tag each finding with the control
        for f in result:
            f["control_id"] = str(control.id)
        return result

    async def _run_tool(self, tool_name: str, args: dict) -> str:
        if tool_name == "report_finding":
            finding = {
                "title": args.get("title", "Untitled Finding"),
                "description": args.get("description", ""),
                "severity": args.get("severity", "medium"),
                "remediation": args.get("remediation", ""),
                "validation_result": args.get("validation_result", "not_tested"),
                "control_ref": args.get("control_ref", ""),
            }
            self._findings_buffer.append(finding)
            return f"Finding recorded: {finding['title']}"
        return await super()._run_tool(tool_name, args)

    async def _tool_db_query(self, args: dict) -> str:
        connector_id = args.get("connector_id")
        sql = args.get("sql", "")
        for _, conn_instance in self.connectors:
            from apps.conductor.integrations.db_connector import DBConnector
            if isinstance(conn_instance, DBConnector):
                try:
                    rows = await conn_instance.run_query(sql)
                    return json.dumps(rows[:20])
                except Exception as exc:
                    return f"DB error: {exc}"
        return "No database connector available"

    async def _tool_api_fetch(self, args: dict) -> str:
        endpoint = args.get("endpoint", "/")
        for _, conn_instance in self.connectors:
            from apps.conductor.integrations.api_connector import APIConnector
            if isinstance(conn_instance, APIConnector):
                try:
                    data = await conn_instance.get(endpoint)
                    return json.dumps(data)[:1000]
                except Exception as exc:
                    return f"API error: {exc}"
        return "No API connector available"

    async def _tool_ssh_exec(self, args: dict) -> str:
        command = args.get("command", "")
        for _, conn_instance in self.connectors:
            from apps.conductor.integrations.ssh_connector import SSHConnector
            if isinstance(conn_instance, SSHConnector):
                try:
                    return await conn_instance.exec_command(command)
                except Exception as exc:
                    return f"SSH error: {exc}"
        return "No SSH connector available"

    def _save_findings(self, findings: List[dict]) -> int:
        count = 0
        for f in findings:
            AiAgentFinding.objects.create(
                run_id=self.run_id,
                control_id=f.get("control_id"),
                title=f["title"][:512],
                description=f["description"][:4000],
                severity=f.get("severity", "medium"),
                remediation=f.get("remediation", "")[:4000],
                validation_result=f.get("validation_result", "not_tested"),
                needs_human_review=f.get("severity") in ("critical", "high"),
            )
            count += 1
        return count
