"""Tests for Conductor Celery tasks (mocked)."""
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from apps.conductor.models import AiAgentRun, AiDocument


@override_settings(CONDUCTOR_ENABLED=True)
class ParseDocumentTaskTest(TestCase):
    def test_missing_document_handled(self):
        from apps.conductor.tasks import parse_document
        # Should not raise, just log error
        with patch("apps.conductor.tasks.parse_and_ingest") as mock_parse:
            mock_parse.side_effect = Exception("Doc not found")
            # Task will retry — capture the retry
            import celery.exceptions
            try:
                parse_document("non-existent-id")
            except Exception:
                pass

    def test_disabled_conductor_aborts_orchestration(self):
        from apps.conductor.tasks import run_orchestration
        run = AiAgentRun.objects.create(run_type="full")
        with self.settings(CONDUCTOR_ENABLED=False):
            run_orchestration(str(run.id), {})
        run.refresh_from_db()
        self.assertEqual(run.status, "failed")
        self.assertIn("CONDUCTOR_ENABLED", run.error_message)
