"""Tests for Conductor agents (mocked Ollama)."""
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from django.test import TestCase, override_settings
from apps.conductor.models import AiAgentRun, AiAgentFinding, AiAgentStep
from apps.conductor.agents.validator import ControlValidationAgent
from apps.conductor.agents.reviewer import ReviewVerificationAgent


@override_settings(CONDUCTOR_ENABLED=True)
class BaseAgentToolParseTest(TestCase):
    """Test tool call parsing robustness."""

    def test_parse_valid_json(self):
        from apps.conductor.agents.base_agent import BaseAgent
        # We can't instantiate abstract class, test via validator
        run = AiAgentRun.objects.create(run_type="validate")
        agent = ControlValidationAgent(str(run.id))
        loop = asyncio.new_event_loop()

        valid_response = json.dumps({"tool": "done", "args": {}})
        result = loop.run_until_complete(agent._parse_tool_call(valid_response, [], ""))
        loop.close()
        self.assertEqual(result, ("done", {}))

    def test_parse_json_in_markdown_block(self):
        from apps.conductor.models import AiAgentRun
        run = AiAgentRun.objects.create(run_type="validate")
        agent = ControlValidationAgent(str(run.id))
        loop = asyncio.new_event_loop()
        wrapped = '```json\n{"tool": "done", "args": {}}\n```'
        result = loop.run_until_complete(agent._parse_tool_call(wrapped, [], ""))
        loop.close()
        self.assertEqual(result[0], "done")


@override_settings(CONDUCTOR_ENABLED=True)
class ReviewerScoreCalculationTest(TestCase):
    def test_score_no_findings(self):
        run = AiAgentRun.objects.create(run_type="review")
        agent = ReviewVerificationAgent(str(run.id))
        score = agent._calculate_score([])
        self.assertEqual(score, 100.0)

    def test_score_with_critical_finding(self):
        run = AiAgentRun.objects.create(run_type="review")
        finding = AiAgentFinding.objects.create(
            run=run, title="Critical gap", description="...", severity="critical", validation_result="fail"
        )
        agent = ReviewVerificationAgent(str(run.id))
        score = agent._calculate_score([finding])
        self.assertLess(score, 100.0)
        self.assertGreaterEqual(score, 0.0)

    def test_score_clamped_to_zero(self):
        run = AiAgentRun.objects.create(run_type="review")
        findings = [
            AiAgentFinding.objects.create(
                run=run, title=f"Gap {i}", description="...", severity="critical", validation_result="fail"
            )
            for i in range(10)
        ]
        agent = ReviewVerificationAgent(str(run.id))
        score = agent._calculate_score(findings)
        self.assertEqual(score, 0.0)


cat > /home/user/MIRA/backend/apps/conductor/tests/test_connectors.py << 'PYEOF'
"""Tests for integration connectors."""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from django.test import TestCase
from apps.conductor.integrations.db_connector import DBConnector, _is_safe_query
from apps.conductor.integrations.api_connector import APIConnector


class DBConnectorSafetyTest(TestCase):
    def test_select_is_safe(self):
        self.assertTrue(_is_safe_query("SELECT * FROM users"))

    def test_delete_blocked(self):
        self.assertFalse(_is_safe_query("DELETE FROM users"))

    def test_drop_blocked(self):
        self.assertFalse(_is_safe_query("DROP TABLE users"))

    def test_select_with_drop_in_value(self):
        # "DROP" in a value should not block (simple keyword check)
        # This is a known limitation — document it
        sql = "SELECT * FROM logs WHERE message = 'drop something'"
        # Our simple check will incorrectly block this — acceptable trade-off for security
        self.assertFalse(_is_safe_query(sql))

    def test_insert_blocked(self):
        self.assertFalse(_is_safe_query("INSERT INTO users VALUES (1)"))

    def test_non_select_blocked(self):
        self.assertFalse(_is_safe_query("EXEC xp_cmdshell('whoami')"))


class CryptoServiceTest(TestCase):
    def test_encrypt_decrypt_roundtrip(self):
        from apps.conductor.services.crypto_service import encrypt, decrypt
        original = "super-secret-password-123"
        encrypted = encrypt(original)
        self.assertNotEqual(encrypted, original)
        decrypted = decrypt(encrypted)
        self.assertEqual(decrypted, original)

    def test_different_values_produce_different_ciphertext(self):
        from apps.conductor.services.crypto_service import encrypt
        e1 = encrypt("password1")
        e2 = encrypt("password2")
        self.assertNotEqual(e1, e2)
