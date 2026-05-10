from django.apps import AppConfig


class ConductorConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.conductor"
    verbose_name = "AI Conductor"

    def ready(self):
        import apps.conductor.signals  # noqa: F401
