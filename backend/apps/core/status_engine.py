"""
Dynamic Status Engine: evaluates StatusRule objects and updates matching records.
"""
import logging
import operator as op
from datetime import date, datetime

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

_OPERATORS = {
    "eq": op.eq,
    "neq": op.ne,
    "gt": op.gt,
    "gte": op.ge,
    "lt": op.lt,
    "lte": op.le,
}


def _coerce(value, field_value):
    """Try to coerce *value* to the same type as *field_value*."""
    if isinstance(field_value, bool):
        return str(value).lower() in ("1", "true", "yes")
    if isinstance(field_value, (int, float)):
        try:
            return type(field_value)(value)
        except (TypeError, ValueError):
            return value
    if isinstance(field_value, (date, datetime)):
        return field_value  # skip coercion; compare as-is
    return value


def _evaluate_condition(instance, condition: dict) -> bool:
    field = condition.get("field", "")
    operator = condition.get("operator", "eq")
    expected = condition.get("value")

    # Support dotted attribute access (e.g. "owner__email")
    attr = field.replace("__", ".")
    parts = attr.split(".")
    actual = instance
    try:
        for part in parts:
            actual = getattr(actual, part)
        if callable(actual):
            actual = actual()
    except AttributeError:
        return False

    if operator == "is_null":
        return actual is None
    if operator == "is_not_null":
        return actual is not None
    if operator == "in":
        return actual in (expected or [])
    if operator == "not_in":
        return actual not in (expected or [])

    op_fn = _OPERATORS.get(operator)
    if op_fn is None:
        logger.warning("Unknown operator '%s' in StatusRule", operator)
        return False

    expected = _coerce(expected, actual)
    try:
        return op_fn(actual, expected)
    except TypeError:
        return False


def evaluate_rule(rule) -> int:
    """
    Evaluate a single StatusRule against all objects of its content_type.
    Returns the number of records updated.
    """
    model_class = rule.content_type.model_class()
    if model_class is None:
        return 0

    if not hasattr(model_class, "status"):
        logger.warning("Model %s has no 'status' field; skipping rule %s", model_class, rule)
        return 0

    queryset = model_class.objects.all()
    conditions = rule.conditions or []
    affected = 0

    with transaction.atomic():
        for instance in queryset.iterator(chunk_size=500):
            if instance.status == rule.target_status:
                continue  # already at target status
            if all(_evaluate_condition(instance, c) for c in conditions):
                instance.status = rule.target_status
                instance.save(update_fields=["status", "updated_at"])
                affected += 1

    rule.last_run_at = timezone.now()
    rule.last_affected_count = affected
    rule.save(update_fields=["last_run_at", "last_affected_count"])

    return affected


def evaluate_all_rules() -> dict:
    """Run all active StatusRules. Returns {rule_id: affected_count}."""
    from .models import StatusRule

    results = {}
    for rule in StatusRule.objects.filter(rule_status=StatusRule.RuleStatus.ACTIVE).select_related(
        "content_type"
    ):
        try:
            count = evaluate_rule(rule)
            results[str(rule.id)] = count
            logger.info("StatusRule '%s' updated %d records", rule.name, count)
        except Exception:
            logger.exception("StatusRule '%s' evaluation failed", rule.name)
            results[str(rule.id)] = -1
    return results
