"""Tests for Conductor signal behavior (manual promotion flow)."""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.conductor.models import AiAgentRun, AiAgentFinding
from apps.controls.models import Control


@override_settings(CONDUCTOR_ENABLED=True)
class ManualPromotionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="admin@example.com", password="testpass123!", role="admin"
        )
        self.client.force_authenticate(user=self.user)
        self.run = AiAgentRun.objects.create(run_type="validate")
        self.control = Control.objects.create(
            title="Access Control", description="Manage access", control_type="preventive"
        )

    def test_promote_finding_creates_control_issue(self):
        from apps.controls.models import ControlIssue
        finding = AiAgentFinding.objects.create(
            run=self.run, control=self.control,
            title="Access control gap", description="No MFA enforced",
            severity="high", validation_result="fail"
        )
        r = self.client.post(f"/api/v1/conductor/findings/{finding.id}/promote/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("issue_id", r.json())

        finding.refresh_from_db()
        self.assertEqual(finding.status, "promoted")
        self.assertIsNotNone(finding.promoted_to_issue_id)

        issue = ControlIssue.objects.get(id=r.json()["issue_id"])
        self.assertEqual(issue.title, "Access control gap")
        self.assertEqual(issue.severity, "high")
        self.assertEqual(issue.control, self.control)

    def test_finding_stays_separate_without_promotion(self):
        from apps.controls.models import ControlIssue
        AiAgentFinding.objects.create(
            run=self.run, control=self.control,
            title="Another gap", description="...", severity="medium"
        )
        self.assertEqual(ControlIssue.objects.count(), 0)

    def test_cannot_promote_twice(self):
        finding = AiAgentFinding.objects.create(
            run=self.run, control=self.control,
            title="Gap", description="...", severity="medium"
        )
        self.client.post(f"/api/v1/conductor/findings/{finding.id}/promote/")
        r = self.client.post(f"/api/v1/conductor/findings/{finding.id}/promote/")
        self.assertEqual(r.status_code, 400)
