"""
Conductor signals — no auto-promotion of findings to ControlIssues.
Users promote manually via the API.
"""
import logging

logger = logging.getLogger(__name__)
# Signals file intentionally minimal — promotion is user-driven.
