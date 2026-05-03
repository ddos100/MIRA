from django.apps import AppConfig


class RisksConfig(AppConfig):
    name = "apps.risks"
    verbose_name = "Risk Management"

    def ready(self):
        import apps.risks.signals  # noqa: F401
