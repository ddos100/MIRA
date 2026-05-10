# MIRA-Conductor

**AI-powered cybersecurity automation** — automated control validation, evidence collection, review & verification, and compliance reporting. All LLM inference runs **locally via Ollama** — no data ever leaves your server.

Designed to operate standalone and integrate with [MIRA GRC](https://github.com/ddos100/MIRA) via REST API.

---

## Features

| Capability | Description |
|---|---|
| **Local LLM** | Ollama embedded — llama3:8b, mistral:7b, codellama:7b, nomic-embed-text |
| **Document Intelligence** | Upload PDF, DOCX, XLSX, CSV, TXT, images (OCR) → auto-chunked → RAG pipeline |
| **Control Validation Agent** | Tests controls against frameworks using documents + connectors |
| **Evidence Collection Agent** | Gathers evidence from DB, API, SSH, webhooks, or manual upload |
| **Review & Verification Agent** | LLM analysis of evidence against compliance requirements |
| **Reporting Agent** | Generates executive summaries, audit reports, remediation roadmaps (PDF) |
| **Customizable Frameworks** | ISO 27001:2022 · NIST CSF 2.0 · PCI-DSS 4.0 · SOC2 · CIS Controls v8 · GDPR + custom |
| **Integration Hub** | Database · REST API · SSH · Inbound Webhooks · MIRA GRC API |
| **Evidence Integrity** | SHA-256 chain-of-custody for all evidence files |
| **Full Web UI** | React 18 + TypeScript + Tailwind — Dashboard, Documents, Frameworks, Evidence, Agents, Integrations, Reports, Settings |

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url> conductor && cd conductor

# 2. Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY, ENCRYPTION_KEY, POSTGRES_PASSWORD at minimum

# 3. Start all services (Postgres, Redis, ChromaDB, Ollama, Backend, Celery, Frontend)
docker compose up -d

# 4. Wait for Ollama to pull models (~5–15 min on first start, depending on bandwidth)
docker compose logs -f ollama

# 5. Load built-in compliance frameworks
curl -X POST http://localhost:8000/api/v1/frameworks/load-builtins

# 6. Open the UI
open http://localhost:3000

# API docs
open http://localhost:8000/api/docs
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     MIRA-Conductor                           │
│                                                              │
│  React UI (port 3000)                                        │
│      │                                                       │
│  FastAPI Backend (port 8000)                                 │
│      ├── Control Validation Agent  ──► document_search       │
│      ├── Evidence Collection Agent ──► db_query / api_fetch  │
│      │                                  ssh_exec / upload    │
│      ├── Review & Verification Agent ──► LLM analysis        │
│      └── Reporting Agent ──────────────► PDF / JSON          │
│                                                              │
│  Ollama (port 11434) ── all LLM inference, NO external calls │
│  ChromaDB (port 8001) ── local vector store                  │
│  PostgreSQL (port 5433) ── state, models, findings           │
│  Redis + Celery ── async agent execution                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Services

| Service | Port | Purpose |
|---|---|---|
| `frontend` | 3000 | React UI |
| `backend` | 8000 | FastAPI + API docs at `/api/docs` |
| `ollama` | 11434 | Local LLM server |
| `chromadb` | 8001 | Vector store |
| `postgres` | 5433 | Primary database |
| `redis` | 6380 | Celery broker |
| `celery_worker` | — | Async agent tasks |
| `celery_beat` | — | Scheduled connector syncs |

---

## Integration with MIRA GRC

Add a **MIRA connector** in the Integrations page:
- **Connector Type**: `mira`
- **Base URL**: your MIRA instance URL
- **API Key**: MIRA API key

Conductor will push findings → MIRA `ControlIssues`, pull frameworks, and sync reports.

---

## Adding Frameworks

**Option 1 — Built-ins** (ISO 27001, NIST CSF 2.0, PCI-DSS 4.0, SOC2, CIS v8, GDPR):
```bash
curl -X POST http://localhost:8000/api/v1/frameworks/load-builtins
```

**Option 2 — Import JSON**:
```bash
curl -X POST http://localhost:8000/api/v1/frameworks/import \
  -F "file=@my_framework.json"
```

**Option 3 — Create via UI**: Frameworks page → New Framework → add controls manually.

**Option 4 — Pull from MIRA**: Configure a MIRA connector, then use `/api/v1/frameworks/sync/mira`.

---

## Evidence Collection Methods

| Method | How |
|---|---|
| Manual upload | Evidence page → Upload Evidence (any file) |
| Document upload | Documents page → auto-parsed and RAG-indexed |
| Database query | Add DB connector → agent runs SQL queries |
| REST API | Add REST API connector → agent fetches endpoints |
| SSH command | Add SSH connector → agent runs remote commands |
| Inbound Webhook | Add Webhook connector → receives payloads at `/api/v1/integrations/webhooks/receive/{token}` |
| MIRA GRC sync | MIRA connector pulls existing evidence |

---

## Ollama Models

Default models pulled at startup:

| Model | Size | Use |
|---|---|---|
| `llama3:8b` | 4.7 GB | Primary reasoning, reports |
| `mistral:7b` | 4.1 GB | Alternative reasoning |
| `codellama:7b` | 3.8 GB | Config/code analysis |
| `nomic-embed-text` | 274 MB | Embeddings (RAG) |

Add models via **Settings → Local Models → Pull**.

GPU support: uncomment the `deploy.resources` block in `docker-compose.yml`.

---

## Development

```bash
# Backend only (with local Postgres + Redis + Ollama from Docker)
cd backend
pip install -r requirements/development.txt
uvicorn app.main:app --reload

# Run migrations
alembic upgrade head

# Frontend
cd frontend
npm install
npm run dev
```

---

*MIRA-Conductor v1.0.0 — Local-first AI cybersecurity automation*
