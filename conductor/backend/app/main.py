"""MIRA-Conductor — FastAPI application factory."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import engine
from app.models import Base
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "documents"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "reports"), exist_ok=True)

    # Create DB tables (Alembic handles migrations; this is a safety net for dev)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # ── Shutdown ─────────────────────────────────────────────────
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="MIRA-Conductor",
        description=(
            "AI-powered cybersecurity automation: Control Validation, "
            "Evidence Collection, Review & Verification, and Reporting. "
            "All LLM inference is local via Ollama — no data sent to external providers."
        ),
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────
    app.include_router(api_router)

    # ── Health ───────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health():
        from app.llm.ollama_client import get_ollama
        ollama_ok = await get_ollama().health()
        return {
            "status": "ok",
            "ollama": "healthy" if ollama_ok else "unavailable",
            "version": "1.0.0",
        }

    return app


app = create_app()
