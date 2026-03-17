# MIRA GRC Platform

**MIRA** (Managed Information Risk & Assurance) is an open-source, enterprise-grade GRC platform built with Django + React. It covers the full spectrum of Governance, Risk & Compliance work: risk registers, compliance frameworks, controls, policies, incidents, vendor management, business continuity, privacy, and more.

---

## Feature Overview

| Module | Capabilities |
|--------|-------------|
| **Risk Management** | Risk register, treatment plans, reviews, heat-map, CSV export |
| **Compliance** | Multi-framework programs (ISO 27001, GDPR, NIST CSF, PCI DSS, SOC 2, HIPAA, CIS), gap analysis |
| **Controls** | Control library, test records, issues, CSV export |
| **Policies** | Policy lifecycle (draft → approved → expired), version history |
| **Exceptions** | Exception workflow (pending → approved), risk linkage |
| **Incidents** | Incident tracking, timeline, severity classification |
| **Assets** | Asset inventory with classification and ownership |
| **Vendor / Third-Party** | Vendor registry, risk tiering, periodic reviews |
| **Business Continuity** | BIA, continuity plans, test records |
| **Privacy (GDPR)** | Processing activities, DPIAs, DSR management |
| **Projects** | Project and task management linked to GRC objects |
| **Assessments** | Questionnaire templates, auto-scored responses, external portal (no-login token link) |
| **Awareness** | Training programs, assignment tracking |
| **Reports & Dashboards** | Real-time KPIs, configurable widget dashboards, PDF/Excel/CSV export, scheduled delivery |
| **Webhooks / SIEM** | Outbound webhooks with HMAC-SHA256 signing, event filtering, delivery audit trail |
| **Notifications** | In-app live notification panel (30 s polling) |
| **Audit Log** | Immutable system-wide audit trail |
| **OIDC / SSO** | Sign-in with any OpenID Connect provider (Okta, Azure AD, Keycloak, …) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 · Django 5 · Django REST Framework |
| Frontend | React 18 · TypeScript · Tailwind CSS |
| Database | PostgreSQL 16 |
| Task Queue | Celery 5 · Redis 7 |
| Auth | JWT (SimpleJWT) · django-allauth · OIDC |
| Reports | WeasyPrint (PDF) · openpyxl (Excel) |
| API Docs | drf-spectacular (OpenAPI 3 / Swagger) |
| Containers | Docker · Docker Compose · Kubernetes · Helm 3 |
| CI | GitHub Actions |

---

## Quick Start (Docker – 5 minutes)

**Prerequisites:** Docker ≥ 24, Docker Compose v2.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/MIRA.git && cd MIRA

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env – set SECRET_KEY at minimum

# 3. Start all services
docker compose up -d

# 4. Apply database migrations
docker compose exec backend python manage.py migrate

# 5. Load built-in compliance frameworks and requirements
docker compose exec backend python manage.py loaddata \
  apps/compliance/fixtures/compliance_requirements.json

# 6. Create your first admin user
docker compose exec backend python manage.py createsuperuser
```

Access the platform:

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | React frontend |
| `http://localhost:8000/api/docs/` | Swagger UI |
| `http://localhost:8000/admin/` | Django admin |

---

## Repository Structure

```
MIRA/
├── backend/
│   ├── apps/
│   │   ├── core/           # Base models, audit log, notifications, webhooks
│   │   ├── accounts/       # Users, roles, TOTP 2FA
│   │   ├── organizations/  # Business units (MPTT hierarchy)
│   │   ├── assets/         # Asset inventory
│   │   ├── risks/          # Risk register + treatment plans
│   │   ├── compliance/     # Compliance programs + requirements
│   │   ├── controls/       # Control library + tests + issues
│   │   ├── policies/       # Policy lifecycle management
│   │   ├── exceptions/     # Policy exception workflow
│   │   ├── incidents/      # Incident management
│   │   ├── privacy/        # GDPR: processing activities, DPIA, DSR
│   │   ├── continuity/     # BCP, BIA, continuity tests
│   │   ├── third_parties/  # Vendor management + risk reviews
│   │   ├── projects/       # Projects and tasks
│   │   ├── assessments/    # Questionnaires + external token portal
│   │   ├── awareness/      # Training programs + assignments
│   │   └── reports/        # Dashboards, saved reports, exports, scheduling
│   ├── config/             # Django settings (base / development / production)
│   └── requirements/       # base.txt · development.txt · production.txt
├── frontend/
│   └── src/
│       ├── api/            # Axios + React Query wrappers per module
│       ├── components/     # Shared UI components (layout, TopBar, etc.)
│       ├── pages/          # Route-level page components
│       └── store/          # Zustand global state (auth)
├── docker/
│   ├── backend/Dockerfile
│   ├── frontend/Dockerfile
│   └── nginx/nginx.conf
├── k8s/                    # Raw Kubernetes manifests
├── helm/mira/              # Production Helm chart (Bitnami postgresql + redis)
├── docs/
│   ├── development.md      # Local dev guide
│   └── deployment.md       # Full production deployment reference
├── docker-compose.yml      # Development compose stack
└── docker-compose.prod.yml # Production overrides
```

---

## Deployment Options

| Method | Best for | Guide |
|--------|----------|-------|
| Docker Compose (dev) | Local development | [Quick Start](#quick-start-docker--5-minutes) above |
| Docker Compose (prod) | Single-server production | [docs/deployment.md](docs/deployment.md#docker-compose-production) |
| Kubernetes (raw) | Multi-node / cloud-native | [docs/deployment.md](docs/deployment.md#kubernetes-raw-manifests) |
| Helm | Kubernetes with simple config | [docs/deployment.md](docs/deployment.md#helm-chart) |

---

## Configuration Reference

All backend settings are configured via environment variables (or `backend/.env`).

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | — | Django secret key – generate with `openssl rand -hex 50` |
| `DATABASE_URL` | **Yes** | — | `postgres://user:pass@host:5432/dbname` |
| `REDIS_URL` | **Yes** | — | `redis://host:6379/0` |
| `ALLOWED_HOSTS` | **Yes** | `*` | Comma-separated hostnames / IPs |
| `DEBUG` | No | `False` | Never `True` in production |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated frontend origins |

### Email

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_BACKEND` | console | Use `smtp.EmailBackend` for real mail |
| `EMAIL_HOST` | localhost | SMTP server |
| `EMAIL_PORT` | 587 | SMTP port |
| `EMAIL_HOST_USER` | — | SMTP username |
| `EMAIL_HOST_PASSWORD` | — | SMTP password |
| `EMAIL_USE_TLS` | True | STARTTLS |
| `DEFAULT_FROM_EMAIL` | `noreply@mira.local` | Sender address |

### OIDC / SSO

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_ENABLED` | `False` | Enable OpenID Connect SSO |
| `OIDC_PROVIDER_NAME` | `SSO` | Label shown on the login button |
| `OIDC_SERVER_URL` | — | IdP discovery URL (ends in `/.well-known/openid-configuration`) |
| `OIDC_CLIENT_ID` | — | OAuth2 client ID |
| `OIDC_CLIENT_SECRET` | — | OAuth2 client secret |

### Frontend (`.env` in `frontend/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend API base URL |
| `VITE_SSO_ENABLED` | `false` | Show "Sign in with SSO" button |

---

## Assessment External Portal

Every Assessment has a unique token URL for external respondents:

```
https://your-mira-host/portal/assessment/<token>
```

No login is required. The respondent can read all questions and submit answers.
YES/NO and SCALE questions are auto-scored. Access the portal URL from:

- **Admin:** Assessment detail page
- **API:** `GET /api/assessments/assessments/<id>/` → `portal_url` field
- **Backend:** `assessment.portal_url()`

---

## Webhooks / SIEM Integration

Outbound webhooks push real-time events to external systems.

1. **Settings → Webhooks → Add Webhook** – enter URL, events, and optional HMAC secret
2. MIRA signs every request: `X-MIRA-Signature: sha256=<hmac-sha256>`
3. Delivery history is tracked in **Settings → Webhooks → (row) → Deliveries**

**Verifying the signature** in your receiver:

```python
import hmac, hashlib

def verify_mira_webhook(secret: str, raw_body: bytes, signature_header: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**Available event names** (use `*` to subscribe to all):

```
risk.created          risk.updated          risk.deleted
incident.created      incident.updated
control.created       control.updated
policy.created        policy.approved
exception.created     exception.approved
assessment.completed
test.ping             (test button in Settings)
```

---

## SSO / OIDC Setup

```dotenv
OIDC_ENABLED=true
OIDC_PROVIDER_NAME=Okta
OIDC_SERVER_URL=https://dev-xxxxxx.okta.com
OIDC_CLIENT_ID=0oa...
OIDC_CLIENT_SECRET=...
```

Register this redirect URI in your IdP:
```
https://your-mira-host/accounts/oidc/callback/
```

Compatible providers: **Okta**, **Azure AD / Entra**, **Google Workspace**, **Keycloak**, **Auth0**, **Authentik**, and any standard OIDC provider.

---

## API Authentication

```bash
# 1. Obtain tokens
curl -X POST https://mira.example.com/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
# → {"access": "eyJ...", "refresh": "eyJ..."}

# 2. Call any endpoint
curl https://mira.example.com/api/risks/risks/ \
  -H 'Authorization: Bearer <access_token>'

# 3. Refresh the access token
curl -X POST https://mira.example.com/api/auth/token/refresh/ \
  -d '{"refresh":"<refresh_token>"}'
```

Tokens expire after **60 minutes** (access) and **7 days** (refresh).

---

## Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/development.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver           # → http://localhost:8000

# Celery worker (separate terminal)
celery -A config worker --loglevel=info

# Celery beat (separate terminal)
celery -A config beat --loglevel=info \
  --scheduler django_celery_beat.schedulers:DatabaseScheduler

# Frontend (separate terminal)
cd frontend && npm install && npm run dev   # → http://localhost:3000
```

```bash
# Run backend tests
cd backend && pytest --cov=apps -v

# Run frontend tests
cd frontend && npm test

# Type-check frontend
cd frontend && npx tsc --noEmit
```

---

## Included Compliance Fixtures

After running `loaddata apps/compliance/fixtures/compliance_requirements.json`:

| Framework | Requirements included |
|-----------|----------------------|
| ISO 27001:2022 | Annex A controls 5.x – 8.x |
| GDPR | Art. 5, 6, 13, 17, 25, 32, 33, 35 |
| NIST CSF 2.0 | GV, ID, PR, DE, RS, RC domains |

---

## Default User Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to all modules |
| `risk_manager` | Manage risks and treatment plans |
| `compliance_analyst` | Manage compliance programs and assessments |
| `auditor` | Read-only + run control tests |
| `control_owner` | Manage assigned controls |
| `policy_owner` | Manage assigned policies |
| `viewer` | Read-only access across all modules |

---

## License

MIT – see [LICENSE](LICENSE).
