"""
Auto-capture audit logs and dispatch webhook events for every MIRA model.

Registers post_save / post_delete signal handlers for all concrete models
that inherit from BaseModel.  Runs in CoreConfig.ready().
"""
import logging

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_delete, post_save, pre_save

logger = logging.getLogger(__name__)

# ─── Model → webhook event prefix registry ───────────────────────────────────
# Populated via register_model() below; auto-filled from app config.
_WATCHED: dict[type, str] = {}  # Model class → event prefix e.g. "risk"


def register_model(model_cls, event_prefix: str | None = None):
    prefix = event_prefix or model_cls._meta.model_name
    _WATCHED[model_cls] = prefix


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_field_changes(instance, old_instance) -> dict:
    """Return {field: [old, new]} for changed fields."""
    if old_instance is None:
        return {}
    changes = {}
    for field in instance._meta.concrete_fields:
        name = field.attname
        old_val = getattr(old_instance, name, None)
        new_val = getattr(instance, name, None)
        if old_val != new_val:
            changes[field.name] = [str(old_val), str(new_val)]
    return changes


def _write_audit(action: str, instance, changes: dict):
    from .middleware import get_client_ip, get_current_request, get_current_user
    from .models import AuditLog

    user = get_current_user()
    request = get_current_request()
    try:
        ct = ContentType.objects.get_for_model(instance.__class__)
        AuditLog.objects.create(
            user=user if user and hasattr(user, "pk") and user.pk else None,
            action=action,
            content_type=ct,
            object_id=str(instance.pk),
            object_repr=str(instance)[:500],
            changes=changes,
            ip_address=get_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "")[:500] if request else ""),
        )
    except Exception:
        logger.exception("AuditLog write failed for %s %s", action, instance)


def _dispatch(action: str, instance):
    from .webhook_tasks import dispatch_webhook_event

    prefix = _WATCHED.get(instance.__class__, "")
    if not prefix:
        return
    try:
        dispatch_webhook_event(
            f"{prefix}.{action}",
            {
                "id": str(instance.pk),
                "model": instance.__class__.__name__,
                "repr": str(instance)[:200],
            },
        )
    except Exception:
        logger.exception("Webhook dispatch failed for %s.%s", prefix, action)


# ─── Signal handlers ──────────────────────────────────────────────────────────

# Store old instances before save for change detection
_pre_save_cache: dict[str, object] = {}


def _pre_save_handler(sender, instance, **kwargs):
    if sender not in _WATCHED:
        return
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _pre_save_cache[str(instance.pk)] = old
        except sender.DoesNotExist:
            pass


def _post_save_handler(sender, instance, created, **kwargs):
    if sender not in _WATCHED:
        return
    action = "create" if created else "update"
    old = _pre_save_cache.pop(str(instance.pk), None)
    changes = {} if created else _get_field_changes(instance, old)
    _write_audit(action, instance, changes)
    _dispatch(action, instance)


def _post_delete_handler(sender, instance, **kwargs):
    if sender not in _WATCHED:
        return
    _write_audit("delete", instance, {})
    _dispatch("delete", instance)


# ─── Auto-registration ────────────────────────────────────────────────────────

_SKIP_APPS = {"core", "auth", "admin", "sessions", "contenttypes"}
_SKIP_MODELS = {"auditlog", "notification", "webhookdelivery", "customfieldvalue"}


def connect_signals():
    """
    Discover all concrete BaseModel subclasses across installed apps and
    wire up pre_save / post_save / post_delete handlers.
    """
    from django.apps import apps as django_apps

    from .models import BaseModel

    for app_config in django_apps.get_app_configs():
        if app_config.label in _SKIP_APPS:
            continue
        for model in app_config.get_models():
            if not issubclass(model, BaseModel):
                continue
            if model._meta.abstract:
                continue
            if model._meta.model_name in _SKIP_MODELS:
                continue

            register_model(model)
            pre_save.connect(_pre_save_handler, sender=model, weak=False)
            post_save.connect(_post_save_handler, sender=model, weak=False)
            post_delete.connect(_post_delete_handler, sender=model, weak=False)

    logger.debug("MIRA signals connected for %d models", len(_WATCHED))
