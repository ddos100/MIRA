from .base import *  # noqa

DEBUG = True

INSTALLED_APPS += ["debug_toolbar"]  # noqa

MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa

INTERNAL_IPS = ["127.0.0.1"]

# Use console email in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relax password validators in dev
AUTH_PASSWORD_VALIDATORS = []
