"""Fernet encryption for connector credentials using MIRA's SECRET_KEY."""
import base64
import hashlib
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _get_fernet():
    try:
        from cryptography.fernet import Fernet
        raw = settings.SECRET_KEY.encode()
        key = base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
        return Fernet(key)
    except ImportError:
        raise RuntimeError("cryptography package not installed. Add it to requirements.")


def encrypt(value: str) -> str:
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    f = _get_fernet()
    return f.decrypt(token.encode()).decode()
