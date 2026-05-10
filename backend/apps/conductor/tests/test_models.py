"""Tests for Conductor models."""
import pytest
from django.test import TestCase
from apps.conductor.models import (
    AiConnector, AiDocument, AiAgentRun, AiAgentFinding, AiReport
)


class AiConnectorModelTest(TestCase):
    def test_str_representation(self):
        c = AiConnector(name="Test DB", connector_type="db")
        self.assertIn("Test DB", str(c))
        self.assertIn("db", str(c))

    def test_default_test_status(self):
        c = AiConnector.objects.create(name="Test", connector_type="rest_api")
        self.assertEqual(c.last_test_status, "untested")
        self.assertTrue(c.is_active)


class AiDocumentModelTest(TestCase):
    def test_default_parse_status(self):
        doc = AiDocument.objects.create(name="test.pdf", file_path="/tmp/test.pdf")
        self.assertEqual(doc.parse_status, "pending")
        self.assertEqual(doc.chunk_count, 0)

    def test_str_representation(self):
        doc = AiDocument(name="policy.pdf", file_path="/tmp/p.pdf")
        self.assertEqual(str(doc), "policy.pdf")


class AiAgentRunModelTest(TestCase):
    def test_default_values(self):
        run = AiAgentRun.objects.create(run_type="full")
        self.assertEqual(run.status, "pending")
        self.assertEqual(run.progress_pct, 0)
        self.assertEqual(run.findings_count, 0)
        self.assertIsNone(run.compliance_score)

    def test_str_no_framework(self):
        run = AiAgentRun(run_type="validate", status="pending")
        self.assertIn("validate", str(run))


class AiAgentFindingModelTest(TestCase):
    def test_finding_default_status(self):
        run = AiAgentRun.objects.create(run_type="full")
        f = AiAgentFinding.objects.create(
            run=run, title="Test Finding", description="Gap found", severity="high"
        )
        self.assertEqual(f.status, "open")
        self.assertEqual(f.validation_result, "not_tested")
        self.assertFalse(f.needs_human_review)
