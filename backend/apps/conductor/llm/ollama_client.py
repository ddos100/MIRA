"""Async Ollama client — all LLM inference stays local."""
import asyncio
import json
import logging
from typing import AsyncGenerator, List, Optional

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

_client: Optional["OllamaClient"] = None


def get_ollama() -> "OllamaClient":
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client


class OllamaClient:
    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://ollama:11434")
        self.default_model = getattr(settings, "OLLAMA_MODEL", "llama3:8b")
        self.embed_model = getattr(settings, "OLLAMA_EMBED_MODEL", "nomic-embed-text")
        self.timeout = httpx.Timeout(120.0, connect=10.0)

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)

    async def health(self) -> bool:
        try:
            async with self._client() as c:
                r = await c.get("/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[dict]:
        try:
            async with self._client() as c:
                r = await c.get("/api/tags")
                r.raise_for_status()
                return r.json().get("models", [])
        except Exception as exc:
            logger.warning("Ollama list_models failed: %s", exc)
            return []

    async def chat(
        self,
        messages: List[dict],
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
    ) -> str:
        m = model or self.default_model
        payload: dict = {"model": m, "messages": messages, "stream": False, "options": {"temperature": temperature}}
        if system:
            payload["system"] = system
        for attempt in range(3):
            try:
                async with self._client() as c:
                    r = await c.post("/api/chat", json=payload)
                    r.raise_for_status()
                    return r.json()["message"]["content"]
            except Exception as exc:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
        return ""

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
    ) -> str:
        m = model or self.default_model
        payload: dict = {"model": m, "prompt": prompt, "stream": False, "options": {"temperature": temperature}}
        if system:
            payload["system"] = system
        for attempt in range(3):
            try:
                async with self._client() as c:
                    r = await c.post("/api/generate", json=payload)
                    r.raise_for_status()
                    return r.json().get("response", "")
            except Exception as exc:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
        return ""

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        m = model or self.embed_model
        async with self._client() as c:
            r = await c.post("/api/embeddings", json={"model": m, "prompt": text})
            r.raise_for_status()
            return r.json().get("embedding", [])

    async def embed_batch(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        return [await self.embed(t, model) for t in texts]

    async def pull_model(self, model: str) -> AsyncGenerator[str, None]:
        async with self._client() as c:
            async with c.stream("POST", "/api/pull", json={"name": model}) as r:
                async for line in r.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            yield data.get("status", "")
                        except json.JSONDecodeError:
                            pass
