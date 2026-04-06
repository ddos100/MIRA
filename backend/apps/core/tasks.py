"""Celery tasks for the core app (status engine, etc.)."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def run_status_engine():
    """Evaluate all active StatusRules and apply auto-transitions."""
    from .status_engine import evaluate_all_rules

    results = evaluate_all_rules()
    total = sum(v for v in results.values() if v >= 0)
    logger.info("Status engine run complete: %d total records updated", total)
    return results
