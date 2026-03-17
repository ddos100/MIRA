# MIRA Development Guide

## Quick Start

```bash
# 1. Clone & start services
git clone https://github.com/your-org/MIRA && cd MIRA
cp .env.example backend/.env

# 2. Start with Docker Compose
docker-compose up -d

# 3. Run migrations
docker-compose exec backend python manage.py migrate

# 4. Load initial fixture data (frameworks, categories)
docker-compose exec backend python manage.py load_initial_data

# 5. Create admin user
docker-compose exec backend python manage.py createsuperuser

# 6. Access the app
# Frontend:  http://localhost:3000
# API:       http://localhost:8000/api/v1/
# API Docs:  http://localhost:8000/api/v1/docs/
# Admin:     http://localhost:8000/admin/
```

## Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements/development.txt
python manage.py migrate
python manage.py load_initial_data
python manage.py runserver

# Celery worker (separate terminal)
celery -A config worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Generating Migrations

After modifying models, run:
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

## Running Tests

```bash
# Backend
cd backend && pytest --cov=apps -v

# Frontend
cd frontend && npm test
```

## API Documentation

- Swagger UI: http://localhost:8000/api/v1/docs/
- ReDoc:       http://localhost:8000/api/v1/redoc/
- Schema JSON: http://localhost:8000/api/v1/schema/

## Default Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to all modules |
| `risk_manager` | Manage risks and treatment plans |
| `compliance_analyst` | Manage compliance programs and assessments |
| `auditor` | Read-only + can run control tests |
| `control_owner` | Manage their assigned controls |
| `policy_owner` | Manage their assigned policies |
| `viewer` | Read-only access |

## Compliance Frameworks Included

After running `load_initial_data`, the following frameworks are available:
- ISO/IEC 27001:2022
- PCI DSS v4.0
- GDPR (EU 2016/679)
- SOC 2 (AICPA)
- NIST Cybersecurity Framework 2.0
- HIPAA
- CIS Controls v8
