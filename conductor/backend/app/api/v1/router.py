from fastapi import APIRouter
from app.api.v1 import documents, frameworks, evidence, agents, integrations, reports, ollama

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(documents.router)
api_router.include_router(frameworks.router)
api_router.include_router(evidence.router)
api_router.include_router(agents.router)
api_router.include_router(integrations.router)
api_router.include_router(reports.router)
api_router.include_router(ollama.router)
