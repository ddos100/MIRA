"""Abstract BaseAgent — all four agent types inherit from this.
Defines the tool-loop lifecycle, step persistence, and result streaming.
"""
import json
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.models.agent import AgentRun, AgentStep
from app.llm.ollama_client import get_ollama
from app.llm.rag_pipeline import get_rag


class Tool:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    async def run(self, **kwargs) -> Any:
        raise NotImplementedError


class BaseAgent(ABC):
    agent_type: str = "base"
    system_prompt: str = ""

    def __init__(self, db: AsyncSession, run_id: str):
        self.db = db
        self.run_id = run_id
        self.ollama = get_ollama()
        self.rag = get_rag()
        self._tools: Dict[str, Tool] = {}
        self._step_counter = 0
        self._register_tools()

    @abstractmethod
    def _register_tools(self) -> None:
        """Register tools available to this agent."""
        ...

    def register_tool(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def _tools_description(self) -> str:
        lines = ["Available tools (call by responding with JSON {\"tool\": name, \"args\": {...}}):"]
        for name, tool in self._tools.items():
            lines.append(f"  - {name}: {tool.description}")
        return "\n".join(lines)

    async def _persist_step(
        self,
        action: str,
        tool_used: Optional[str] = None,
        input_data: Optional[Dict] = None,
        output_data: Optional[Dict] = None,
        duration_ms: Optional[int] = None,
        result: str = "success",
        error_detail: Optional[str] = None,
    ) -> AgentStep:
        self._step_counter += 1
        step = AgentStep(
            run_id=self.run_id,
            agent_type=self.agent_type,
            step_number=self._step_counter,
            action=action,
            tool_used=tool_used,
            input_data=input_data,
            output_data=output_data,
            duration_ms=duration_ms,
            result=result,
            error_detail=error_detail,
        )
        self.db.add(step)
        await self.db.commit()
        return step

    async def _update_run_progress(self, progress_pct: int, current_agent: str) -> None:
        await self.db.execute(
            update(AgentRun)
            .where(AgentRun.id == self.run_id)
            .values(progress_pct=progress_pct, current_agent=current_agent)
        )
        await self.db.commit()

    async def _parse_tool_call(self, response: str) -> Optional[Tuple[str, Dict]]:
        """Parse a tool call from LLM response. Returns (tool_name, args) or None."""
        text = response.strip()
        # Look for JSON block
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        try:
            data = json.loads(text[start:end])
            if "tool" in data:
                return data["tool"], data.get("args", {})
        except json.JSONDecodeError:
            pass
        return None

    async def _run_tool(self, tool_name: str, args: Dict) -> str:
        tool = self._tools.get(tool_name)
        if not tool:
            return f"Error: unknown tool '{tool_name}'"
        t0 = time.monotonic()
        try:
            result = await tool.run(**args)
            duration = int((time.monotonic() - t0) * 1000)
            await self._persist_step(
                action=f"tool_call:{tool_name}",
                tool_used=tool_name,
                input_data=args,
                output_data={"result": str(result)[:2000]},
                duration_ms=duration,
            )
            return json.dumps(result) if not isinstance(result, str) else result
        except Exception as exc:
            await self._persist_step(
                action=f"tool_call:{tool_name}",
                tool_used=tool_name,
                input_data=args,
                result="error",
                error_detail=str(exc),
            )
            return f"Tool error: {exc}"

    async def run_loop(
        self,
        initial_prompt: str,
        max_iterations: int = 10,
    ) -> str:
        """Execute the agent reasoning loop with tool use."""
        system = f"{self.system_prompt}\n\n{self._tools_description()}"
        messages = [{"role": "user", "content": initial_prompt}]

        await self._persist_step(
            action="agent_start",
            input_data={"prompt_preview": initial_prompt[:500]},
        )

        for _ in range(max_iterations):
            t0 = time.monotonic()
            response = await self.ollama.chat(
                messages=messages,
                system=system,
                temperature=0.05,
            )
            duration = int((time.monotonic() - t0) * 1000)

            await self._persist_step(
                action="llm_response",
                output_data={"response_preview": response[:500]},
                duration_ms=duration,
            )

            tool_call = await self._parse_tool_call(response)
            if tool_call:
                tool_name, args = tool_call
                tool_result = await self._run_tool(tool_name, args)
                messages.extend([
                    {"role": "assistant", "content": response},
                    {"role": "user", "content": f"Tool result:\n{tool_result}"},
                ])
            else:
                # No tool call — agent is done
                await self._persist_step(
                    action="agent_complete",
                    output_data={"final_response_preview": response[:500]},
                )
                return response

        return "Max iterations reached"

    @abstractmethod
    async def execute(self, scope: Dict) -> Dict:
        """Main entry point for each agent. Returns structured results."""
        ...
