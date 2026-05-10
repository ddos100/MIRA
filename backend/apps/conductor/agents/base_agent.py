"""
Base AI agent with tool-loop pattern.
Every LLM call and tool invocation is persisted as an AiAgentStep for full auditability.
"""
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple

from django.utils import timezone

from apps.conductor.llm.ollama_client import get_ollama
from apps.conductor.models import AiAgentRun, AiAgentStep

logger = logging.getLogger(__name__)

MAX_PARSE_RETRIES = 3
FORMAT_REMINDER = '\n\nIMPORTANT: Respond ONLY with valid JSON in format: {"tool": "tool_name", "args": {...}}'


class BaseAgent(ABC):
    agent_type: str = "base"

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.ollama = get_ollama()
        self._step_counter = 0

    async def run_loop(self, initial_prompt: str, system: str, max_iterations: int = 10) -> str:
        messages = [{"role": "user", "content": initial_prompt}]
        last_response = ""

        for iteration in range(max_iterations):
            t0 = time.monotonic()
            try:
                response = await self.ollama.chat(messages, system=system)
            except Exception as exc:
                await self._persist_step("llm_call", "", {"messages_count": len(messages)},
                                         {"error": str(exc)}, result="error", error_detail=str(exc))
                logger.error("[%s] LLM call failed: %s", self.agent_type, exc)
                break

            elapsed = int((time.monotonic() - t0) * 1000)
            last_response = response
            await self._persist_step("llm_call", "", {"messages_count": len(messages)},
                                     {"response": response[:500]}, duration_ms=elapsed)

            tool_call = await self._parse_tool_call(response, messages, system)
            if tool_call is None:
                # Max retries exhausted — stop loop
                break

            tool_name, args = tool_call
            if tool_name == "done":
                break

            t0 = time.monotonic()
            try:
                tool_output = await self._run_tool(tool_name, args)
                elapsed = int((time.monotonic() - t0) * 1000)
                await self._persist_step(f"tool:{tool_name}", tool_name, args,
                                         {"output": str(tool_output)[:500]}, duration_ms=elapsed)
            except Exception as exc:
                elapsed = int((time.monotonic() - t0) * 1000)
                await self._persist_step(f"tool:{tool_name}", tool_name, args,
                                         {"error": str(exc)}, result="error", error_detail=str(exc),
                                         duration_ms=elapsed)
                tool_output = f"Tool error: {exc}"

            messages.append({"role": "assistant", "content": response})
            messages.append({"role": "user", "content": f"Tool result for {tool_name}: {tool_output}"})

        return last_response

    async def _parse_tool_call(self, response: str, messages: list, system: str) -> Optional[Tuple[str, Dict]]:
        for attempt in range(MAX_PARSE_RETRIES):
            text = response.strip()
            # Extract JSON block if wrapped in markdown
            if "```" in text:
                parts = text.split("```")
                for p in parts[1::2]:
                    text = p.strip().lstrip("json").strip()
                    break
            try:
                data = json.loads(text)
                return data.get("tool"), data.get("args", {})
            except json.JSONDecodeError:
                if attempt < MAX_PARSE_RETRIES - 1:
                    retry_prompt = f"{response}\n\n{FORMAT_REMINDER}"
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": "Please reformat your response as valid JSON."})
                    try:
                        response = await self.ollama.chat(messages, system=system)
                    except Exception:
                        break
        logger.warning("[%s] Could not parse tool call after %d retries", self.agent_type, MAX_PARSE_RETRIES)
        return ("done", {})

    async def _persist_step(
        self, action: str, tool_used: str, input_data: dict, output_data: dict,
        duration_ms: int = None, result: str = "success", error_detail: str = ""
    ) -> None:
        self._step_counter += 1
        step_num = self._step_counter
        await asyncio.to_thread(
            AiAgentStep.objects.create,
            run_id=self.run_id,
            agent_type=self.agent_type,
            step_number=step_num,
            action=action[:255],
            tool_used=tool_used[:128],
            input_data=input_data,
            output_data=output_data,
            duration_ms=duration_ms,
            result=result,
            error_detail=error_detail[:2000],
        )

    async def _update_run_progress(self, progress_pct: int, current_agent: str = "") -> None:
        await asyncio.to_thread(
            AiAgentRun.objects.filter(id=self.run_id).update,
            progress_pct=progress_pct,
            current_agent=current_agent or self.agent_type,
        )

    async def _run_tool(self, tool_name: str, args: dict) -> str:
        method = getattr(self, f"_tool_{tool_name}", None)
        if method is None:
            return f"Unknown tool: {tool_name}"
        return await method(args)

    async def _tool_document_search(self, args: dict) -> str:
        from apps.conductor.llm.rag_pipeline import get_rag
        query = args.get("query", "")
        results = await get_rag().search(query, n_results=5)
        if not results:
            return "No documents found matching the query."
        return "\n\n---\n\n".join(r["content"] for r in results)

    @abstractmethod
    async def execute(self, scope: Dict) -> Dict:
        """Run the agent. Returns a result dict."""
