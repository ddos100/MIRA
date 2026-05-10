"""Tests for Conductor API endpoints."""
import pytest
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.conductor.models import AiConnector, AiDocument, AiAgentRun, AiAgentFinding


@override_settings(CONDUCTOR_ENABLED=False)
class ConductorDisabledTest(TestCase):
    """When CONDUCTOR_ENABLED=False, all endpoints must return 503."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass123!", role="admin"
        )
        self.client.force_authenticate(user=self.user)

    def test_status_returns_disabled(self):
        r = self.client.get("/api/v1/conductor/status/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["enabled"])

    def test_documents_blocked(self):
        r = self.client.get("/api/v1/conductor/documents/")
        self.assertEqual(r.status_code, 403)

    def test_runs_blocked(self):
        r = self.client.get("/api/v1/conductor/runs/")
        self.assertEqual(r.status_code, 403)

    def test_findings_blocked(self):
        r = self.client.get("/api/v1/conductor/findings/")
        self.assertEqual(r.status_code, 403)


@override_settings(CONDUCTOR_ENABLED=True)
class ConductorPermissionsTest(TestCase):
    """RBAC: only allowed roles can trigger runs."""

    def setUp(self):
        self.client = APIClient()

    def _auth_as(self, role):
        user = User.objects.create_user(
            email=f"{role}@example.com", password="testpass123!", role=role
        )
        self.client.force_authenticate(user=user)
        return user

    def test_viewer_cannot_create_run(self):
        self._auth_as("viewer")
        r = self.client.post("/api/v1/conductor/runs/", {"run_type": "validate"})
        self.assertEqual(r.status_code, 403)

    def test_compliance_analyst_can_read_findings(self):
        self._auth_as("compliance_analyst")
        r = self.client.get("/api/v1/conductor/findings/")
        self.assertEqual(r.status_code, 200)

    def test_unauthenticated_blocked(self):
        r = self.client.get("/api/v1/conductor/runs/")
        self.assertEqual(r.status_code, 401)


@override_settings(CONDUCTOR_ENABLED=True)
class AiAgentRunAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="admin@example.com", password="testpass123!", role="admin"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_runs_empty(self):
        r = self.client.get("/api/v1/conductor/runs/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 0)

    def test_duplicate_run_blocked(self):
        from apps.compliance.models import ComplianceFramework
        fw = ComplianceFramework.objects.create(name="ISO 27001", short_code="ISO27001", version="2022")
        AiAgentRun.objects.create(run_type="full", framework=fw, status="running")
        r = self.client.post("/api/v1/conductor/runs/", {"run_type": "full", "framework": str(fw.id)})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["code"], "run_in_progress")


@override_settings(CONDUCTOR_ENABLED=True)
class AiAgentFindingAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="analyst@example.com", password="testpass123!", role="compliance_analyst"
        )
        self.client.force_authenticate(user=self.user)
        self.run = AiAgentRun.objects.create(run_type="validate")

    def test_list_findings(self):
        AiAgentFinding.objects.create(run=self.run, title="Gap 1", description="...", severity="high")
        r = self.client.get("/api/v1/conductor/findings/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)

    def test_filter_by_severity(self):
        AiAgentFinding.objects.create(run=self.run, title="High gap", description="...", severity="high")
        AiAgentFinding.objects.create(run=self.run, title="Low gap", description="...", severity="low")
        r = self.client.get("/api/v1/conductor/findings/?severity=high")
        self.assertEqual(r.json()["count"], 1)
        self.assertEqual(r.json()["results"][0]["severity"], "high")

    def test_dismiss_finding(self):
        f = AiAgentFinding.objects.create(run=self.run, title="Gap", description="...", severity="medium")
        r = self.client.patch(f"/api/v1/conductor/findings/{f.id}/", {"status": "dismissed"})
        self.assertEqual(r.status_code, 200)
        f.refresh_from_db()
        self.assertEqual(f.status, "dismissed")

    def test_promote_without_control_fails(self):
        f = AiAgentFinding.objects.create(run=self.run, title="Gap", description="...", severity="medium")
        r = self.client.post(f"/api/v1/conductor/findings/{f.id}/promote/")
        self.assertEqual(r.status_code, 400)


@override_settings(CONDUCTOR_ENABLED=True)
class WebhookReceiveTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.connector = AiConnector.objects.create(
            name="Test Webhook", connector_type="webhook",
            webhook_token="test-token-abc123", is_active=True
        )

    def test_valid_token_accepted(self):
        r = self.client.post(
            f"/api/v1/conductor/webhooks/receive/test-token-abc123/",
            {"event": "scan_completed", "findings": 3},
            format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["received"])

    def test_invalid_token_rejected(self):
        r = self.client.post(
            "/api/v1/conductor/webhooks/receive/bad-token/",
            {"event": "test"},
            format="json"
        )
        self.assertEqual(r.status_code, 404)
