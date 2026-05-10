"""Async wrapper around the Ollama HTTP API.
All LLM inference stays local — no external AI provider calls.
"""
import json
from typing import AsyncGenerator, List, Optional
import httpx
from app.config import get_settings

settings = get_settings()


class OllamaClient:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.timeout = settings.ollama_timeout
        self.llm_model = settings.ollama_llm_model
        self.embed_model = settings.ollama_embed_model

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)

    async def health(self) -> bool:
        try:
            async with self._client() as client:
                r = await client.get("/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[dict]:
        async with self._client() as client:
            r = await client.get("/api/tags")
            r.raise_for_status()
            return r.json().get("models", [])

    async def pull_model(self, model: str) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=600) as client:
            async with client.stream("POST", "/api/pull", json={"name": model}) as r:
                async for line in r.aiter_lines():
                    if line:
                        yield line

    async def chat(
        self,
        messages: List[dict],
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
        stream: bool = False,
    ) -> str:
        payload_messages = []
        if system:
            payload_messages.append({"role": "system", "content": system})
        payload_messages.extend(messages)

        payload = {
            "model": model or self.llm_model,
            "messages": payload_messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        async with self._client() as client:
            r = await client.post("/api/chat", json=payload)
            r.raise_for_status()
            return r.json()["message"]["content"]

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
    ) -> str:
        payload = {
            "model": model or self.llm_model,
            "prompt": prompt,
            "system": system or "",
            "stream": False,
            "options": {"temperature": temperature},
        }
        async with self._client() as client:
            r = await client.post("/api/generate", json=payload)
            r.raise_for_status()
            return r.json()["response"]

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        payload = {"model": model or self.embed_model, "prompt": text}
        async with self._client() as client:
            r = await client.post("/api/embeddings", json=payload)
            r.raise_for_status()
            return r.json()["embedding"]

    async def embed_batch(
        self, texts: List[str], model: Optional[str] = None
    ) -> List[List[float]]:
        return [await self.embed(t, model) for t in texts]


_ollama_client: Optional[OllamaClient] = None


def get_ollama() -> OllamaClient:
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
