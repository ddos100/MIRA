"""Ollama model management API."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.llm.ollama_client import get_ollama

router = APIRouter(prefix="/ollama", tags=["Ollama"])


class PullRequest(BaseModel):
    model: str


@router.get("/health")
async def ollama_health():
    ollama = get_ollama()
    healthy = await ollama.health()
    return {"healthy": healthy, "base_url": ollama.base_url}


@router.get("/models")
async def list_models():
    ollama = get_ollama()
    try:
        models = await ollama.list_models()
        return {"models": models}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Ollama: {exc}")


@router.post("/models/pull")
async def pull_model(body: PullRequest):
    ollama = get_ollama()

    async def stream_pull():
        async for line in ollama.pull_model(body.model):
            yield f"data: {line}\n\n"

    return StreamingResponse(stream_pull(), media_type="text/event-stream")


@router.post("/chat")
async def quick_chat(messages: list, model: str = None, system: str = None):
    ollama = get_ollama()
    response = await ollama.chat(messages=messages, model=model, system=system)
    return {"response": response}
