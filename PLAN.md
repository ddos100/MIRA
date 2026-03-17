# MIRA - Managed GRC Solution
## Comprehensive Implementation Plan

Inspired by [Eramba](https://www.eramba.org), MIRA is a full-featured, open-source GRC (Governance, Risk, and Compliance) platform built with a modern Python/Django + React stack.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, Django 5.x, Django REST Framework |
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 16 |
| Task Queue | Celery + Redis |
| Auth | Django Allauth + JWT (djangorestframework-simplejwt) |
| File Storage | Django Storages (local or S3-compatible) |
| Search | PostgreSQL full-text search (pgvector optional) |
| Reports | WeasyPrint (PDF), openpyxl (Excel) |
| API Docs | drf-spectacular (OpenAPI/Swagger) |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Repository Structure

```
MIRA/
├── backend/
│   ├── config/                  # Django project settings
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── core/                # Shared abstractions (base models, permissions, notifications)
│   │   ├── accounts/            # User management, roles, LDAP/SSO
│   │   ├── organizations/       # Business units, org structure
│   │   ├── assets/              # Asset management
│   │   ├── third_parties/       # Vendor / third-party management
│   │   ├── risks/               # Risk management
│   │   ├── compliance/          # Compliance management
│   │   ├── controls/            # Internal controls
│   │   ├── policies/            # Policy management
│   │   ├── exceptions/          # Exception management
│   │   ├── incidents/           # Incident management
│   │   ├── privacy/             # Data privacy / GDPR
│   │   ├── continuity/          # Business continuity plans
│   │   ├── projects/            # Project management
│   │   ├── assessments/         # Online assessments / questionnaires
│   │   ├── awareness/           # Awareness & training programs
│   │   ├── reports/             # Reporting engine & dashboards
│   │   └── api/                 # API versioning router
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   └── production.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level page components
│   │   ├── modules/             # Feature modules (mirrors backend apps)
│   │   ├── store/               # Zustand global state
│   │   ├── api/                 # API client (axios + react-query)
│   │   ├── hooks/               # Custom hooks
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── backend/Dockerfile
│   ├── frontend/Dockerfile
│   └── nginx/nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/workflows/
│   ├── test.yml
│   └── deploy.yml
└── docs/
    ├── architecture.md
    ├── api.md
    └── deployment.md
```

---

## Module Specifications

### 1. Core / Shared Framework (`apps/core`)

Foundation used by every other module.

**Models:**
- `BaseModel` – `id` (UUID), `created_at`, `updated_at`, `created_by`, `updated_by`
- `Tag` – global tagging system
- `Comment` – polymorphic comments for any object
- `Attachment` – file uploads linked to any object
- `AuditLog` – immutable activity log for every create/update/delete
- `Notification` – in-app + email notification records
- `CustomField` – runtime-defined extra fields per module
- `WorkflowState` – configurable approval/review workflows

**Features:**
- Role-Based Access Control (RBAC) with per-object permissions
- Configurable email notifications (SMTP / SendGrid)
- Celery periodic tasks for reminders and scheduled reviews
- REST API base viewsets with filtering (django-filter), sorting, pagination
- Full-text search across all modules

---

### 2. Accounts & Authentication (`apps/accounts`)

**Models:**
- `User` – extends AbstractUser; department, phone, avatar, timezone
- `Group` – extends Django groups with GRC role presets
- `UserSession` – JWT token tracking

**Features:**
- Local username/password auth
- SSO via SAML2 / OIDC (social-django / python3-saml)
- LDAP/AD sync (django-auth-ldap)
- MFA (TOTP via django-otp)
- Password policies
- API key management per user
- User invitation and onboarding flow

---

### 3. Organizations / Business Units (`apps/organizations`)

**Models:**
- `Organization` – top-level tenant
- `BusinessUnit` – hierarchical org structure (parent/child)
- `BusinessProcess` – processes owned by a business unit

**Features:**
- Tree-view of organizational hierarchy
- Assign ownership of GRC objects to business units
- Bulk reassignment on reorg

---

### 4. Asset Management (`apps/assets`)

**Models:**
- `AssetCategory` – configurable categories (Hardware, Software, Data, People, etc.)
- `Asset` – name, description, category, owner, business unit, criticality, value
- `DataAsset` – extends Asset with data classification, retention policy, processing purpose
- `DataFlow` – source → destination asset data-flow mapping

**Features:**
- Asset inventory with CRUD and bulk import (CSV)
- Criticality scoring (1–5)
- Data classification labels (Public, Internal, Confidential, Restricted)
- Data flow diagrams (exportable)
- Asset-to-risk and asset-to-control linkage

---

### 5. Third-Party / Vendor Management (`apps/third_parties`)

**Models:**
- `ThirdParty` – vendor name, type, contact info, contract dates, criticality
- `ThirdPartyReview` – periodic review record with status and findings
- `ThirdPartyAssessment` – link to an Assessment (questionnaire) sent to vendor

**Features:**
- Vendor registry with lifecycle management
- Automated review scheduling (Celery)
- Inherent risk scoring
- Questionnaire distribution to external contacts
- Vendor risk rating rollup

---

### 6. Risk Management (`apps/risks`)

**Models:**
- `RiskCategory` – configurable taxonomy
- `RiskTreatment` – Avoid / Mitigate / Transfer / Accept
- `Risk` – title, description, category, owner, business unit, assets, third parties
- `RiskScoring` – likelihood (1–5) × impact (1–5) = inherent/residual score
- `RiskTreatmentPlan` – actions, owner, due date, linked controls
- `RiskReview` – scheduled review with notes and re-scoring
- `RiskRegister` – aggregated view / filter set

**Features:**
- 5×5 risk heat-map visualization
- Inherent and residual risk calculation
- Treatment plan tracking with task assignments
- Automated review reminders
- Risk appetite / tolerance thresholds with breach alerts
- Risk-to-compliance / control / exception cross-linking
- CSV / PDF export of risk register

---

### 7. Compliance Management (`apps/compliance`)

**Models:**
- `ComplianceFramework` – ISO 27001, PCI-DSS, GDPR, SOC2, NIST, HIPAA, etc.
- `Requirement` – individual requirement/control from a framework (hierarchical)
- `ComplianceProgram` – maps an organization to a framework with a target date
- `ComplianceAssessment` – evaluation of a requirement (status, evidence, notes)
- `ComplianceGap` – identified gap with remediation plan
- `Evidence` – document/screenshot linked to an assessment

**Features:**
- Pre-loaded compliance packages (ISO 27001:2022, PCI DSS 4.0, GDPR, SOC2 TSC, NIST CSF 2.0, HIPAA, CIS Controls v8)
- Custom framework builder
- Requirement-to-control mapping (many-to-many)
- Gap analysis dashboard with % completion
- Automated evidence collection reminders
- Audit-ready evidence export (ZIP + PDF report)
- Multi-framework cross-walk (shared controls across frameworks)

---

### 8. Internal Controls (`apps/controls`)

**Models:**
- `ControlCategory` – configurable taxonomy
- `Control` – title, description, type (preventive/detective/corrective), frequency, owner
- `ControlTest` (Audit) – test plan, tester, schedule, result (Pass/Fail/Partial), evidence
- `ControlIssue` – finding raised from a failed test, with severity and remediation task
- `ControlMaintenanceTask` – recurring operational tasks keeping a control operational
- `ControlReview` – periodic review of control effectiveness

**Features:**
- Control library with versioning
- Automated audit scheduling (Celery)
- Evidence upload per test
- Issue tracking with SLA for remediation
- Control effectiveness dashboard
- RACI matrix export
- Cross-link to risks and compliance requirements

---

### 9. Policy Management (`apps/policies`)

**Models:**
- `PolicyCategory` – configurable (Security, HR, Legal, etc.)
- `Policy` – title, content (rich text), version, status (Draft/Review/Approved/Retired)
- `PolicyVersion` – immutable version history
- `PolicyApproval` – approval workflow step with approver and timestamp
- `PolicyAcknowledgement` – per-user signed acknowledgement record
- `PolicyReview` – scheduled periodic review

**Features:**
- Rich-text policy editor (ProseMirror / TipTap)
- Version control with diff comparison
- Approval workflow (configurable multi-step)
- Employee acknowledgement tracking with deadline
- Automated reminders for unacknowledged policies
- Policy-to-control and policy-to-compliance mapping
- PDF export of policies
- Public policy portal (read-only, no login)

---

### 10. Exception Management (`apps/exceptions`)

**Models:**
- `ExceptionType` – Risk / Compliance / Policy / Control
- `Exception` – title, description, type, linked object, owner, justification
- `ExceptionApproval` – approval record
- `ExceptionReview` – periodic review to confirm exception is still valid
- `ExceptionExpiry` – automatic expiry with notification

**Features:**
- Exception request workflow (submit → review → approve/reject)
- Expiry date management with auto-closure
- Compensating control linkage
- Exception register with status dashboard
- Risk acceptance documentation (for audit evidence)

---

### 11. Incident Management (`apps/incidents`)

**Models:**
- `IncidentCategory` – configurable (Security, Privacy, Operational, etc.)
- `IncidentSeverity` – P1–P4 with SLA definitions
- `Incident` – title, description, category, severity, detected/reported/closed dates, owner
- `IncidentUpdate` – timeline update log
- `IncidentTask` – remediation task with assignee and due date
- `IncidentRootCause` – root cause analysis record
- `IncidentNotification` – regulatory notification tracking (e.g. GDPR 72hr rule)

**Features:**
- Incident intake form (internal + anonymous external)
- Lifecycle: New → Triaged → Investigating → Contained → Resolved → Closed
- SLA tracking with breach alerts
- Root cause analysis (5-Whys, Fishbone template)
- Linked risks, controls, and assets
- GDPR breach notification deadline tracking
- Metrics dashboard (MTTD, MTTR, by category/severity)
- Report generation for management and regulators

---

### 12. Data Privacy (`apps/privacy`)

**Models:**
- `ProcessingActivity` – GDPR Article 30 Record of Processing Activities (RoPA)
- `DataSubjectCategory` – Employees, Customers, Suppliers, etc.
- `LegalBasis` – Consent, Legitimate Interest, Contract, Legal Obligation, etc.
- `DataRetentionPolicy` – retention periods by data type
- `PrivacyImpactAssessment` (DPIA) – assessment with risk scoring
- `DataSubjectRequest` – DSR tracking (access, erasure, portability)
- `ConsentRecord` – consent capture and withdrawal tracking

**Features:**
- RoPA builder and export (Article 30 compliant)
- DPIA wizard with automated risk flagging
- DSR lifecycle management with statutory deadlines
- Data map / data flow visualization
- Cookie consent management tracking
- Breach-to-DSR correlation
- Privacy-by-design checklist for new projects

---

### 13. Business Continuity (`apps/continuity`)

**Models:**
- `BusinessImpactAnalysis` – BIA per business process (RTO, RPO, MTPD)
- `ContinuityPlan` – plan document with scope, triggers, procedures
- `ContinuityPlanVersion` – version history
- `ContinuityTest` – scheduled test/exercise with type (tabletop, simulation, full)
- `ContinuityTestResult` – outcome, lessons learned, issues identified
- `ContinuityIssue` – remediation task from test findings

**Features:**
- BCP template library
- BIA calculator (financial impact, reputational impact)
- Automated test scheduling with calendar view
- Test evidence upload and sign-off
- Post-exercise report generation
- Gap tracking between tests
- Integration with incident management for activation

---

### 14. Projects (`apps/projects`)

**Models:**
- `Project` – title, description, owner, start/end dates, status, budget
- `ProjectMilestone` – milestone with due date and completion status
- `ProjectTask` – task with assignee, due date, priority, linked GRC objects
- `ProjectUpdate` – status update log

**Features:**
- Project dashboard (Kanban + list views)
- Link projects to risks, controls, compliance gaps, and exceptions
- Gantt-style milestone view
- Progress tracking toward GRC improvement goals
- Overdue task notifications
- Resource assignment and workload view

---

### 15. Online Assessments & Questionnaires (`apps/assessments`)

**Models:**
- `AssessmentTemplate` – reusable template with question groups
- `Question` – text, type (text/MCQ/scale/yes-no/file upload), required flag
- `Assessment` – instance of a template sent to a respondent
- `AssessmentResponse` – per-question answer
- `AssessmentScoring` – automatic scoring rules per question type
- `AssessmentCampaign` – bulk send to multiple respondents

**Features:**
- Drag-and-drop question builder
- External respondent access (no login required, token-based link)
- Internal self-assessments (logged-in users)
- Automatic scoring and risk rating from responses
- Vendor/third-party assessment campaigns
- Response comparison across periods
- PDF report of completed assessment
- Deadline tracking and automatic reminders

---

### 16. Awareness & Training (`apps/awareness`)

**Models:**
- `AwarenessProgram` – program with target audience (all / role / department)
- `AwarenessContent` – content item (text article, video URL, PDF)
- `AwarenessAssignment` – assignment of content to a user with deadline
- `AwarenessCompletion` – completion record with date and quiz score
- `AwarenessQuiz` – optional quiz linked to a content item
- `AwarenessQuizAttempt` – per-user attempt with answers and score

**Features:**
- Content library (upload PDFs, embed videos, write articles)
- Role/department-based assignment campaigns
- Pass/fail thresholds for quizzes
- Completion tracking dashboard (% by department)
- Automated reminders for incomplete assignments
- Certificate generation on completion
- Policy acknowledgement can be embedded as an awareness item
- Annual recurring programs with auto re-assignment

---

### 17. Reports & Dashboards (`apps/reports`)

**Models:**
- `Dashboard` – configurable landing dashboard per user/role
- `Widget` – typed widget (counter, chart, table, text, calendar, pivot)
- `Report` – saved report definition with filters and selected fields
- `ReportSchedule` – auto-generate and email report on a schedule
- `ReportExport` – generated export record (PDF / Excel / CSV)

**Widget Types:**
- Counter (e.g., "Open Risks: 12")
- Pie chart, Bar chart, Stacked bar, Line chart
- Data table with sorting/filtering
- Calendar (upcoming reviews, deadlines)
- Pivot table
- Heatmap (risk matrix)
- Text / markdown widget

**Pre-built Reports:**
- Risk Register (with residual scores)
- Compliance Gap Analysis
- Control Testing Status
- Policy Acknowledgement Status
- Incident Summary
- Exception Register
- Vendor Risk Summary
- Audit Readiness Scorecard

**Features:**
- Drag-and-drop dashboard builder
- Per-user and shared dashboards
- Scheduled email delivery (PDF/Excel)
- Export any module list to CSV/Excel/PDF
- Executive summary view
- Board-level reporting package

---

### 18. REST API (`apps/api`)

- Full OpenAPI 3.0 spec auto-generated via drf-spectacular
- Swagger UI at `/api/docs/` and ReDoc at `/api/redoc/`
- Versioned endpoints: `/api/v1/`
- JWT + API key authentication
- Per-endpoint permission enforcement
- Endpoints for every module: CRUD + bulk operations
- Webhook support (outbound) for integration with third-party tools
- Rate limiting (django-ratelimit)

---

## Data Model Relationships

```
Organization
  └── BusinessUnit (tree)
        └── BusinessProcess

Asset ──────────────────────────────────────┐
DataAsset (extends Asset)                   │
DataFlow (Asset → Asset)                    │
                                            │
ThirdParty ─────────────────────────────────┤
                                            │
Risk ←─── RiskScoring                       ├─ linked to any module object
  └── RiskTreatmentPlan ──→ Control         │
                                            │
ComplianceFramework                         │
  └── Requirement                           │
        └── ComplianceAssessment ───────────┘
              └── Evidence

Control ←─── ControlTest
  └── ControlIssue
  └── ControlMaintenanceTask

Policy ←─── PolicyVersion
  └── PolicyAcknowledgement

Exception ──→ (Risk | Requirement | Policy | Control)

Incident ──→ (Asset | Risk | Control)

Project ──→ (Risk | Control | ComplianceGap | Exception)
```

---

## Implementation Phases

### Phase 1 – Foundation (Weeks 1–4)
- [ ] Repository scaffolding (Django project, React app, Docker Compose)
- [ ] Base models (`BaseModel`, `Tag`, `Comment`, `Attachment`, `AuditLog`)
- [ ] Accounts & authentication (local + JWT + MFA)
- [ ] RBAC with default roles (Admin, Risk Manager, Compliance Analyst, Auditor, Viewer)
- [ ] Organizations / business units module
- [ ] Core API infrastructure (versioning, filtering, pagination, error handling)
- [ ] Frontend: login, dashboard shell, navigation sidebar
- [ ] CI pipeline (pytest, flake8, black, mypy, jest)

### Phase 2 – Problem Modules (Weeks 5–10)
- [ ] Asset management (with data assets and data flows)
- [ ] Third-party / vendor management
- [ ] Risk management (register, scoring, treatment, heat-map)
- [ ] Compliance management (framework loader, gap analysis, evidence)
- [ ] Data privacy (RoPA, DPIA, DSR tracking)

### Phase 3 – Solution Modules (Weeks 11–16)
- [ ] Internal controls (library, audit scheduling, issues)
- [ ] Policy management (editor, versioning, approvals, acknowledgements)
- [ ] Exception management (request workflow, expiry)
- [ ] Incident management (lifecycle, root cause, GDPR breach timer)
- [ ] Business continuity (BIA, plans, test scheduling)

### Phase 4 – Engagement Modules (Weeks 17–21)
- [ ] Online assessments & questionnaires (builder, external links, scoring)
- [ ] Awareness & training (content library, assignments, quizzes, certificates)
- [ ] Projects (Kanban, Gantt, GRC linkage)

### Phase 5 – Reporting & Polish (Weeks 22–26)
- [ ] Reports & dashboards (widget engine, drag-and-drop, PDF/Excel export)
- [ ] Pre-built compliance packages (ISO 27001:2022, PCI DSS 4.0, GDPR, SOC2, NIST CSF 2.0)
- [ ] REST API docs and webhook support
- [ ] Notification engine (email + in-app)
- [ ] Performance optimisation (caching, DB indexes, select_related)
- [ ] Security hardening (OWASP review, CSP headers, rate limiting)

### Phase 6 – Enterprise Features (Weeks 27–32)
- [ ] SSO (SAML2 / OIDC)
- [ ] LDAP / Active Directory sync
- [ ] Multi-tenancy support
- [ ] Advanced reporting (scheduled delivery, custom widgets)
- [ ] External assessment portal (white-label)
- [ ] Audit log export and SIEM integration
- [ ] API rate limiting and developer portal
- [ ] Deployment automation (Kubernetes Helm chart)

---

## Key Design Principles

1. **Everything is linked** – risks link to assets, controls, policies, exceptions, and compliance requirements. Cross-module relationships are first-class citizens.
2. **Audit-first** – every mutation is logged immutably. GRC tools live and die by audit trails.
3. **Workflow-driven** – approvals, reviews, and reminders are automated via Celery; nothing falls through the cracks.
4. **Framework-agnostic** – compliance packages are data, not code. New frameworks can be imported via CSV/JSON without a code change.
5. **API-first** – every UI action is backed by a documented REST API endpoint so power users can automate via scripts.
6. **Tenant-ready** – data isolation via Django's multi-tenancy pattern (django-tenants) from day one, even if single-tenant initially.

---

## Development Setup (Target)

```bash
# Clone and start
git clone https://github.com/your-org/MIRA
cd MIRA
docker-compose up -d

# Backend
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py loaddata compliance_frameworks

# Access
# Frontend:  http://localhost:3000
# API:       http://localhost:8000/api/v1/
# API Docs:  http://localhost:8000/api/docs/
# Admin:     http://localhost:8000/admin/
```

---

*MIRA – Managed GRC | Plan version 1.0 | 2026-03-17*
