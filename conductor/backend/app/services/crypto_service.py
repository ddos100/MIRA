"""Fernet symmetric encryption for connector credentials."""
import base64
from cryptography.fernet import Fernet, InvalidToken
from app.config import get_settings

settings = get_settings()


def _get_fernet() -> Fernet:
    key = settings.encryption_key
    # Accept raw Fernet keys or generate one if key looks like a passphrase
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        # Derive a valid Fernet key from the raw secret
        import hashlib
        derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
        return Fernet(derived)


def encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt credential — check ENCRYPTION_KEY")
