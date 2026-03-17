# MIRA – Deployment Guide

This guide covers all supported deployment methods:

1. [Docker Compose (production)](#docker-compose-production)
2. [Kubernetes – raw manifests](#kubernetes-raw-manifests)
3. [Helm chart](#helm-chart)
4. [Post-deployment steps](#post-deployment-steps)
5. [Upgrading](#upgrading)
6. [Backup & restore](#backup--restore)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | v2 (plugin) |
| kubectl | 1.28+ |
| Helm | 3.14+ |
| PostgreSQL | 16 (external or in-cluster) |
| Redis | 7 (external or in-cluster) |

---

## Docker Compose (production)

This is the recommended path for a **single-server** installation.

### 1. Prepare the server

```bash
# Install Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Clone the repo
git clone https://github.com/your-org/MIRA.git /opt/mira
cd /opt/mira
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
nano backend/.env   # fill in all values – see table below
```

Minimum required values for production:

```dotenv
SECRET_KEY=<openssl rand -hex 50>
DATABASE_URL=postgres://mira:STRONG_PASS@db:5432/mira
REDIS_URL=redis://redis:6379/0
ALLOWED_HOSTS=mira.example.com
CORS_ALLOWED_ORIGINS=https://mira.example.com
DEBUG=False
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_HOST_USER=noreply@example.com
EMAIL_HOST_PASSWORD=...
DEFAULT_FROM_EMAIL=MIRA GRC <noreply@example.com>
```

Also update the Postgres password in `docker-compose.yml` → `db.environment.POSTGRES_PASSWORD` and in `DATABASE_URL` above to match.

### 3. Build and start

```bash
# Build images and start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Watch logs
docker compose logs -f
```

### 4. Initialise the database

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py loaddata \
  apps/compliance/fixtures/compliance_requirements.json
docker compose exec backend python manage.py createsuperuser
```

### 5. TLS (HTTPS) with nginx + certbot

Install certbot on the host and obtain a certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mira.example.com
```

Or use the provided nginx config as a template and point it at the running `frontend` container on port 80 and `backend` container on port 8000.

### 6. Verify

```
https://mira.example.com          → React frontend
https://mira.example.com/api/docs/ → Swagger UI
https://mira.example.com/admin/    → Django admin
```

---

## Kubernetes – raw manifests

The `k8s/` directory contains ready-to-apply manifests. Adjust image tags and the ConfigMap before applying.

### 1. Build and push images

```bash
# Backend
docker build -f docker/backend/Dockerfile -t ghcr.io/your-org/mira-backend:1.0.0 .
docker push ghcr.io/your-org/mira-backend:1.0.0

# Frontend
docker build -f docker/frontend/Dockerfile -t ghcr.io/your-org/mira-frontend:1.0.0 .
docker push ghcr.io/your-org/mira-frontend:1.0.0
```

### 2. Update manifests

Edit `k8s/configmap.yaml`:

```yaml
data:
  ALLOWED_HOSTS: "mira.example.com"
  CORS_ALLOWED_ORIGINS: "https://mira.example.com"
```

Edit `k8s/secret.yaml` with base64-encoded values:

```bash
echo -n 'your-secret-key' | base64
echo -n 'postgres://mira:pass@postgres-svc:5432/mira' | base64
```

Update image tags in `k8s/backend-deployment.yaml` and `k8s/frontend-deployment.yaml`.

### 3. Apply

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/celery-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

### 4. Run migrations

```bash
kubectl -n mira exec -it deploy/mira-backend -- \
  python manage.py migrate

kubectl -n mira exec -it deploy/mira-backend -- \
  python manage.py loaddata apps/compliance/fixtures/compliance_requirements.json

kubectl -n mira exec -it deploy/mira-backend -- \
  python manage.py createsuperuser
```

### 5. Check status

```bash
kubectl -n mira get pods
kubectl -n mira get ingress
```

---

## Helm chart

The Helm chart at `helm/mira/` wraps the same manifests with a clean `values.yaml` interface. It uses Bitnami subcharts for PostgreSQL and Redis.

### 1. Add Bitnami repo

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. Install dependencies

```bash
helm dependency build helm/mira/
```

### 3. Configure values

Create a `my-values.yaml` override file:

```yaml
image:
  backend:
    repository: ghcr.io/your-org/mira-backend
    tag: "1.0.0"
  frontend:
    repository: ghcr.io/your-org/mira-frontend
    tag: "1.0.0"

backend:
  secretKey: "<openssl rand -hex 50>"
  allowedHosts: "mira.example.com"
  corsAllowedOrigins: "https://mira.example.com"

email:
  host: smtp.example.com
  user: noreply@example.com
  password: "<smtp-password>"
  defaultFrom: "MIRA GRC <noreply@example.com>"

ingress:
  host: mira.example.com
  tls:
    enabled: true
    certManagerIssuer: letsencrypt-prod

# Enable SSO (optional)
oidc:
  enabled: false
  serverUrl: ""
  clientId: ""
  clientSecret: ""

postgresql:
  auth:
    password: "<strong-db-password>"

replicaCount:
  backend: 3
  celeryWorker: 2
```

### 4. Install

```bash
helm install mira helm/mira/ \
  --namespace mira \
  --create-namespace \
  -f my-values.yaml
```

### 5. Post-install

```bash
# Wait for pods to be ready
kubectl -n mira rollout status deploy/mira-mira-backend

# Run migrations
kubectl -n mira exec -it deploy/mira-mira-backend -- \
  python manage.py migrate

kubectl -n mira exec -it deploy/mira-mira-backend -- \
  python manage.py loaddata apps/compliance/fixtures/compliance_requirements.json

kubectl -n mira exec -it deploy/mira-mira-backend -- \
  python manage.py createsuperuser
```

### Upgrade

```bash
helm upgrade mira helm/mira/ \
  --namespace mira \
  -f my-values.yaml
```

---

## Post-deployment steps

These steps apply regardless of deployment method.

### Load compliance data

```bash
python manage.py loaddata apps/compliance/fixtures/compliance_requirements.json
```

Loads ISO 27001:2022 Annex A, GDPR, and NIST CSF 2.0 requirements.

### Create admin user

```bash
python manage.py createsuperuser
```

### Configure Celery beat schedule

Log in to the **Django admin** (`/admin/`) → **Periodic Tasks** → verify the scheduled tasks (e.g. `run_scheduled_reports`) are present. They are seeded by `apps/core/celery_config.py`.

### Set up email

Test email delivery:

```bash
python manage.py shell -c "
from django.core.mail import send_mail
send_mail('MIRA test', 'It works!', 'test@mira.local', ['you@example.com'])
"
```

### Configure SSO (optional)

Set env vars (see README) and restart the backend. Then visit `/admin/` → **Social Applications** to verify the OIDC app was auto-created. Register `https://your-mira-host/accounts/oidc/callback/` as a redirect URI in your IdP.

### Configure webhooks

Log in → **Settings → Webhooks → Add Webhook**. Send a test ping to verify delivery.

---

## Upgrading

### Docker Compose

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec backend python manage.py migrate
```

### Kubernetes / Helm

```bash
git pull
docker build -f docker/backend/Dockerfile -t ghcr.io/your-org/mira-backend:1.x.x . && docker push ...
docker build -f docker/frontend/Dockerfile -t ghcr.io/your-org/mira-frontend:1.x.x . && docker push ...

helm upgrade mira helm/mira/ --namespace mira -f my-values.yaml \
  --set image.backend.tag=1.x.x \
  --set image.frontend.tag=1.x.x

kubectl -n mira exec -it deploy/mira-mira-backend -- python manage.py migrate
```

---

## Backup & restore

### Database backup (PostgreSQL)

```bash
# Backup
docker compose exec db pg_dump -U mira mira | gzip > mira_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c mira_20240101.sql.gz | docker compose exec -T db psql -U mira mira
```

### Media files backup

```bash
# Backup
docker run --rm -v mira_media_files:/data -v $(pwd):/backup \
  alpine tar czf /backup/media_$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm -v mira_media_files:/data -v $(pwd):/backup \
  alpine tar xzf /backup/media_20240101.tar.gz -C /data
```

### Automated backup (cron)

```cron
0 2 * * * cd /opt/mira && docker compose exec -T db pg_dump -U mira mira | gzip > /var/backups/mira/db_$(date +\%Y\%m\%d).sql.gz
0 3 * * 0 docker run --rm -v mira_media_files:/data -v /var/backups/mira:/backup alpine tar czf /backup/media_$(date +\%Y\%m\%d).tar.gz -C /data .
```

---

## Monitoring

### Health check endpoint

```
GET /api/core/health/
→ {"status": "ok", "service": "MIRA GRC"}
```

Use this for load-balancer health checks and uptime monitoring.

### Recommended metrics to alert on

| Signal | Tool | Alert threshold |
|--------|------|----------------|
| HTTP 5xx rate | nginx/ingress logs | > 1% over 5 min |
| Celery queue depth | Redis `LLEN celery` | > 500 tasks |
| DB connections | pg_stat_activity | > 80% of max_connections |
| Disk usage | host | > 80% |
| Backend pod restarts | Kubernetes | > 3 in 1 hour |

### Celery monitoring (Flower)

Add to `docker-compose.yml`:

```yaml
  flower:
    build:
      context: .
      dockerfile: docker/backend/Dockerfile
    command: celery -A config flower --port=5555
    ports:
      - "5555:5555"
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
    depends_on:
      - redis
```

Access Flower at `http://localhost:5555`.

---

## Troubleshooting

### Backend fails to start

```bash
docker compose logs backend
# Common causes:
# - DATABASE_URL is wrong / DB not ready
# - Missing SECRET_KEY in .env
# - Migration pending: run python manage.py migrate
```

### Celery tasks not running

```bash
docker compose logs celery_worker
# Check: REDIS_URL is reachable
# Check: celery_beat is running and has periodic tasks registered
```

### OIDC login fails

1. Confirm `OIDC_ENABLED=true` and all 4 vars are set
2. Check the redirect URI registered in your IdP matches exactly: `https://your-host/accounts/oidc/callback/`
3. Check Django logs: `docker compose logs backend | grep allauth`

### Webhook delivery failures

Navigate to **Settings → Webhooks** → click a webhook row → **Deliveries tab** to see the HTTP status and response body of each attempt. Deliveries are retried up to 5 times with exponential backoff (30 s, 60 s, 120 s, 240 s, 480 s).

### PDF export fails

WeasyPrint requires system libraries (`libcairo2`, `libpango-1.0-0`). These are installed in the Dockerfile. If running outside Docker, install them:

```bash
# Debian/Ubuntu
sudo apt-get install -y libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0

# RHEL/CentOS
sudo dnf install cairo pango gdk-pixbuf2
```

### Reset admin password

```bash
docker compose exec backend python manage.py changepassword admin@example.com
```
